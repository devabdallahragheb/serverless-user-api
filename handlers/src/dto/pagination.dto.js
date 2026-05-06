import { z } from 'zod';

export const PaginationSchema = z.object({
  limit: z.coerce.number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
  lastEvaluatedKey: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc')
});

export const UserFilterSchema = z.object({
  role: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional()
}).optional();

export class PaginationDto {
  constructor(data = {}) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v != null)
    );
    const validated = PaginationSchema.parse(cleanData);
    this.limit = validated.limit;
    this.lastEvaluatedKey = validated.lastEvaluatedKey 
      ? JSON.parse(Buffer.from(validated.lastEvaluatedKey, 'base64').toString())
      : undefined;
    this.sortOrder = validated.sortOrder;
  }
}

export class UserFilterDto {
  constructor(data = {}) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v != null)
    );
    const validated = UserFilterSchema.parse(cleanData);
    Object.assign(this, validated);
  }

  hasFilters() {
    return Object.keys(this).length > 0;
  }

  buildFilterExpression() {
    const expressions = [];
    const attributeValues = {};
    const attributeNames = {};

    if (this.role) {
      expressions.push('#role = :role');
      attributeNames['#role'] = 'role';
      attributeValues[':role'] = this.role;
    }

    if (this.name) {
      expressions.push('contains(#name, :name)');
      attributeNames['#name'] = 'name';
      attributeValues[':name'] = this.name;
    }

    if (this.email) {
      expressions.push('contains(#email, :email)');
      attributeNames['#email'] = 'email';
      attributeValues[':email'] = this.email.toLowerCase();
    }

    return {
      filterExpression: expressions.length > 0 ? expressions.join(' AND ') : null,
      expressionAttributeValues: attributeValues,
      expressionAttributeNames: attributeNames
    };
  }
}

export class PaginatedResponseDto {
  constructor(items, lastEvaluatedKey, count, scannedCount) {
    this.items = items;
    this.count = count;
    this.scannedCount = scannedCount;
    this.hasMore = !!lastEvaluatedKey;
    this.nextToken = lastEvaluatedKey 
      ? Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64')
      : null;
  }

  static create(items, lastEvaluatedKey, count, scannedCount) {
    return new PaginatedResponseDto(items, lastEvaluatedKey, count, scannedCount);
  }
}
