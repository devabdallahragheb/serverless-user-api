import { randomUUID } from 'crypto';
import { UserRepository } from '../repositories/user.repository.js';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user.dto.js';
import { PaginationDto, UserFilterDto, PaginatedResponseDto } from '../dto/pagination.dto.js';
import { NotFoundError, ValidationError, ConflictError } from '../errors/app-error.js';
import { ERROR_MESSAGES } from '../constants/error-messages.js';
import { ENTITY_TYPES } from '../constants/dynamodb.js';
import { logger } from '../utils/logger.js';

export class UserService {
  constructor() {
    this.userRepository = new UserRepository();
    this.logger = logger.setContext('UserService');
  }

  async createUser(userData) {
    try {
      this.logger.debug('Creating user', { email: userData.email });

      const dto = new CreateUserDto(userData);
      
      const userId = randomUUID();
      const timestamp = new Date().toISOString();

      const userItem = {
        PK: `${ENTITY_TYPES.USER}#${userId}`,
        SK: ENTITY_TYPES.PROFILE,
        id: userId,
        name: dto.name,
        email: dto.email,
        role: dto.role,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const createdUser = await this.userRepository.create(userItem);
      
      this.logger.info('User created', { userId });
      return UserResponseDto.fromDynamoDBItem(createdUser);
    } catch (error) {
      if (error.name === 'ZodError') {
        this.logger.warn('Validation failed', { errors: error.errors });
        throw new ValidationError(ERROR_MESSAGES.VALIDATION_FAILED, error.errors);
      }
      if (error.message === 'Email already exists') {
        throw new ConflictError(ERROR_MESSAGES.USER_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  async getUserById(userId) {
    this.logger.debug('Getting user by ID', { userId });

    const user = await this.userRepository.findById(userId);

    if (!user) {
      this.logger.warn('User not found', { userId });
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    return UserResponseDto.fromDynamoDBItem(user);
  }

  async getAllUsers(paginationParams = {}, filterParams = {}) {
    try {
      this.logger.debug('Getting all users', { paginationParams, filterParams });

      const pagination = new PaginationDto(paginationParams);
      const filters = new UserFilterDto(filterParams);

      const result = await this.userRepository.findAll({
        limit: pagination.limit,
        lastEvaluatedKey: pagination.lastEvaluatedKey,
        filters: filters
      });

      const users = UserResponseDto.fromDynamoDBItems(result.items);
      
      this.logger.info('Users retrieved', { 
        count: result.count,
        scannedCount: result.scannedCount,
        hasMore: !!result.lastEvaluatedKey
      });

      return PaginatedResponseDto.create(
        users,
        result.lastEvaluatedKey,
        result.count,
        result.scannedCount
      );
    } catch (error) {
      if (error.name === 'ZodError') {
        this.logger.warn('Pagination validation failed', { errors: error.errors });
        throw new ValidationError('Invalid pagination parameters', error.errors);
      }
      throw error;
    }
  }

  async updateUser(userId, updateData) {
    try {
      this.logger.debug('Updating user', { userId });

      const dto = new UpdateUserDto(updateData);
      
      const updates = {
        ...dto,
        updatedAt: new Date().toISOString()
      };

      const updatedUser = await this.userRepository.update(userId, updates);

      if (!updatedUser) {
        this.logger.warn('User not found for update', { userId });
        throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      this.logger.info('User updated', { userId });
      return UserResponseDto.fromDynamoDBItem(updatedUser);
    } catch (error) {
      if (error.name === 'ZodError') {
        this.logger.warn('Validation failed', { errors: error.errors });
        throw new ValidationError(ERROR_MESSAGES.VALIDATION_FAILED, error.errors);
      }
      if (error.message === 'Email already in use') {
        throw new ConflictError(ERROR_MESSAGES.USER_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  async deleteUser(userId) {
    this.logger.debug('Deleting user', { userId });

    const deleted = await this.userRepository.delete(userId);

    if (!deleted) {
      this.logger.warn('User not found for deletion', { userId });
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    this.logger.info('User deleted', { userId });
    return { id: userId };
  }
}
