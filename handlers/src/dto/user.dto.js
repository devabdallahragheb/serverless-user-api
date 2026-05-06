import { z } from 'zod';
import { USER_ROLES } from '../constants/dynamodb.js';

export const CreateUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  role: z.enum([
    USER_ROLES.USER,
    USER_ROLES.DEVELOPER,
    USER_ROLES.ADMIN,
    USER_ROLES.SENIOR_DEVELOPER
  ]).optional().default(USER_ROLES.USER)
});

export const UpdateUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim()
    .optional(),
  role: z.enum([
    USER_ROLES.USER,
    USER_ROLES.DEVELOPER,
    USER_ROLES.ADMIN,
    USER_ROLES.SENIOR_DEVELOPER
  ]).optional()
}).refine(
  data => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export const UserIdSchema = z.string()
  .uuid('Invalid user ID format');

export class CreateUserDto {
  constructor(data) {
    const validated = CreateUserSchema.parse(data);
    this.name = validated.name;
    this.email = validated.email;
    this.role = validated.role;
  }
}

export class UpdateUserDto {
  constructor(data) {
    const validated = UpdateUserSchema.parse(data);
    Object.assign(this, validated);
  }
}

export class UserResponseDto {
  constructor(item) {
    this.id = item.id;
    this.name = item.name;
    this.email = item.email;
    this.role = item.role;
    this.createdAt = item.createdAt;
    this.updatedAt = item.updatedAt;
  }

  static fromDynamoDBItem(item) {
    return new UserResponseDto(item);
  }

  static fromDynamoDBItems(items) {
    return items.map(item => new UserResponseDto(item));
  }
}
