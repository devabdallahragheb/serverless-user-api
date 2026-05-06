import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../config/dynamodb.js';
import { TABLE_CONFIG, ENTITY_TYPES } from '../constants/dynamodb.js';
import { DatabaseError } from '../errors/app-error.js';
import { logger } from '../utils/logger.js';

export class UserRepository {
  constructor() {
    this.tableName = TABLE_CONFIG.NAME;
    this.logger = logger.setContext('UserRepository');
  }

  _buildUserKey(userId) {
    return {
      [TABLE_CONFIG.PARTITION_KEY]: `${ENTITY_TYPES.USER}#${userId}`,
      [TABLE_CONFIG.SORT_KEY]: ENTITY_TYPES.PROFILE
    };
  }

  async findByEmail(email) {
    try {
      this.logger.debug('Finding user by email', { email });

      const result = await docClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: TABLE_CONFIG.EMAIL_INDEX,
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email.toLowerCase()
        },
        Limit: 1
      }));

      if (result.Items && result.Items.length > 0) {
        this.logger.debug('User found by email', { email });
        return result.Items[0];
      }

      this.logger.debug('No user found with email', { email });
      return null;
    } catch (error) {
      this.logger.error('Failed to find user by email', error, { email });
      throw new DatabaseError('Failed to check email', error);
    }
  }

  async create(userItem) {
    try {
      this.logger.debug('Creating user', { userId: userItem.id, email: userItem.email });

      const existingUser = await this.findByEmail(userItem.email);
      if (existingUser) {
        this.logger.warn('Email already exists', { email: userItem.email });
        const error = new Error('Email already exists');
        error.name = 'EmailAlreadyExistsError';
        throw error;
      }

      const itemWithGSI = {
        ...userItem,
        [TABLE_CONFIG.GSI1_PK]: ENTITY_TYPES.USER,
        [TABLE_CONFIG.GSI1_SK]: userItem.createdAt,
        [TABLE_CONFIG.GSI2_PK]: `ROLE#${userItem.role.toUpperCase()}`,
        [TABLE_CONFIG.GSI2_SK]: userItem.createdAt
      };

      await docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: itemWithGSI,
        ConditionExpression: 'attribute_not_exists(PK)'
      }));

      this.logger.info('User created successfully', { userId: userItem.id });
      return itemWithGSI;
    } catch (error) {
      if (error.name === 'EmailAlreadyExistsError') {
        throw error;
      }
      if (error.name === 'ConditionalCheckFailedException') {
        this.logger.warn('User already exists', { userId: userItem.id });
        throw new DatabaseError('User already exists', error);
      }
      this.logger.error('Failed to create user', error, { userId: userItem.id });
      throw new DatabaseError('Failed to create user', error);
    }
  }

  async findById(userId) {
    try {
      this.logger.debug('Finding user by ID', { userId });

      const result = await docClient.send(new GetCommand({
        TableName: this.tableName,
        Key: this._buildUserKey(userId)
      }));

      if (!result.Item) {
        this.logger.debug('User not found', { userId });
        return null;
      }

      this.logger.debug('User found', { userId });
      return result.Item;
    } catch (error) {
      this.logger.error('Failed to find user', error, { userId });
      throw new DatabaseError('Failed to retrieve user', error);
    }
  }

  async findAll(options = {}) {
    const { limit = 20, lastEvaluatedKey, filters = {} } = options;

    if (filters.role) {
      return this._queryByRole(filters.role, limit, lastEvaluatedKey, filters);
    }

    return this._queryAllUsers(limit, lastEvaluatedKey, filters);
  }

  async _queryAllUsers(limit, lastEvaluatedKey, filters = {}) {
    try {
      this.logger.debug('Querying all users via GSI1', { limit });

      const queryParams = {
        TableName: this.tableName,
        IndexName: TABLE_CONFIG.GSI1,
        KeyConditionExpression: `${TABLE_CONFIG.GSI1_PK} = :pk`,
        ExpressionAttributeValues: {
          ':pk': ENTITY_TYPES.USER
        },
        Limit: limit,
        ScanIndexForward: false
      };

      if (filters.name || filters.email) {
        const filterParts = [];
        const attributeNames = {};

        if (filters.name) {
          filterParts.push('contains(#name, :name)');
          attributeNames['#name'] = 'name';
          queryParams.ExpressionAttributeValues[':name'] = filters.name;
        }

        if (filters.email) {
          filterParts.push('contains(#email, :email)');
          attributeNames['#email'] = 'email';
          queryParams.ExpressionAttributeValues[':email'] = filters.email.toLowerCase();
        }

        if (filterParts.length > 0) {
          queryParams.FilterExpression = filterParts.join(' AND ');
          queryParams.ExpressionAttributeNames = attributeNames;
        }
      }

      if (lastEvaluatedKey) {
        queryParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await docClient.send(new QueryCommand(queryParams));

      this.logger.info('Users queried via GSI1', {
        count: result.Count,
        scannedCount: result.ScannedCount,
        hasMore: !!result.LastEvaluatedKey
      });

      return {
        items: result.Items || [],
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count,
        scannedCount: result.ScannedCount
      };
    } catch (error) {
      this.logger.error('Failed to query users', error);
      throw new DatabaseError('Failed to query users', error);
    }
  }

  async _queryByRole(role, limit, lastEvaluatedKey, filters = {}) {
    try {
      this.logger.debug('Querying users by role via GSI2', { role, limit });

      const queryParams = {
        TableName: this.tableName,
        IndexName: TABLE_CONFIG.GSI2,
        KeyConditionExpression: `${TABLE_CONFIG.GSI2_PK} = :pk`,
        ExpressionAttributeValues: {
          ':pk': `ROLE#${role.toUpperCase()}`
        },
        Limit: limit,
        ScanIndexForward: false
      };

      if (filters.name || filters.email) {
        const filterParts = [];
        const attributeNames = {};

        if (filters.name) {
          filterParts.push('contains(#name, :name)');
          attributeNames['#name'] = 'name';
          queryParams.ExpressionAttributeValues[':name'] = filters.name;
        }

        if (filters.email) {
          filterParts.push('contains(#email, :email)');
          attributeNames['#email'] = 'email';
          queryParams.ExpressionAttributeValues[':email'] = filters.email.toLowerCase();
        }

        if (filterParts.length > 0) {
          queryParams.FilterExpression = filterParts.join(' AND ');
          queryParams.ExpressionAttributeNames = attributeNames;
        }
      }

      if (lastEvaluatedKey) {
        queryParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await docClient.send(new QueryCommand(queryParams));

      this.logger.info('Users queried by role via GSI2', {
        role,
        count: result.Count,
        scannedCount: result.ScannedCount,
        hasMore: !!result.LastEvaluatedKey
      });

      return {
        items: result.Items || [],
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count,
        scannedCount: result.ScannedCount
      };
    } catch (error) {
      this.logger.error('Failed to query users by role', error, { role });
      throw new DatabaseError('Failed to query users by role', error);
    }
  }

  async scanAll(options = {}) {
    try {
      const { limit = 100, lastEvaluatedKey } = options;

      this.logger.warn('Using SCAN operation - should only be used for admin/debug', { limit });

      const scanParams = {
        TableName: this.tableName,
        FilterExpression: `${TABLE_CONFIG.SORT_KEY} = :sk`,
        ExpressionAttributeValues: {
          ':sk': ENTITY_TYPES.PROFILE
        },
        Limit: limit
      };

      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await docClient.send(new ScanCommand(scanParams));

      this.logger.info('Table scan completed', {
        count: result.Count,
        scannedCount: result.ScannedCount,
        hasMore: !!result.LastEvaluatedKey
      });

      return {
        items: result.Items || [],
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count,
        scannedCount: result.ScannedCount
      };
    } catch (error) {
      this.logger.error('Failed to scan table', error);
      throw new DatabaseError('Failed to scan table', error);
    }
  }

  async update(userId, updates) {
    try {
      this.logger.debug('Updating user', { userId, updates });

      if (updates.email) {
        const existingUser = await this.findByEmail(updates.email);
        if (existingUser && existingUser.id !== userId) {
          this.logger.warn('Email already in use by another user', { email: updates.email });
          throw new DatabaseError('Email already in use', { name: 'EmailAlreadyExistsError' });
        }
      }

      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      Object.entries(updates).forEach(([key, value]) => {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      });

      if (updates.role) {
        updateExpressions.push(`#gsi2pk = :gsi2pk`);
        expressionAttributeNames['#gsi2pk'] = TABLE_CONFIG.GSI2_PK;
        expressionAttributeValues[':gsi2pk'] = `ROLE#${updates.role.toUpperCase()}`;
      }

      const result = await docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: this._buildUserKey(userId),
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: 'attribute_exists(PK)',
        ReturnValues: 'ALL_NEW'
      }));

      this.logger.info('User updated successfully', { userId });
      return result.Attributes;
    } catch (error) {
      if (error.name === 'EmailAlreadyExistsError') {
        throw error;
      }
      if (error.name === 'ConditionalCheckFailedException') {
        this.logger.warn('User not found for update', { userId });
        return null;
      }
      this.logger.error('Failed to update user', error, { userId });
      throw new DatabaseError('Failed to update user', error);
    }
  }

  async delete(userId) {
    try {
      this.logger.debug('Deleting user', { userId });

      await docClient.send(new DeleteCommand({
        TableName: this.tableName,
        Key: this._buildUserKey(userId),
        ConditionExpression: 'attribute_exists(PK)'
      }));

      this.logger.info('User deleted successfully', { userId });
      return true;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        this.logger.warn('User not found for deletion', { userId });
        return false;
      }
      this.logger.error('Failed to delete user', error, { userId });
      throw new DatabaseError('Failed to delete user', error);
    }
  }
}
