export const ENTITY_TYPES = {
  USER: 'USER',
  PROFILE: 'PROFILE'
};

export const TABLE_CONFIG = {
  NAME: process.env.TABLE_NAME || 'Users',
  PARTITION_KEY: 'PK',
  SORT_KEY: 'SK',
  EMAIL_INDEX: 'EmailIndex',
  GSI1: 'GSI1',
  GSI1_PK: 'GSI1PK',
  GSI1_SK: 'GSI1SK',
  GSI2: 'GSI2',
  GSI2_PK: 'GSI2PK',
  GSI2_SK: 'GSI2SK'
};

export const USER_ROLES = {
  USER: 'user',
  DEVELOPER: 'developer',
  ADMIN: 'admin',
  SENIOR_DEVELOPER: 'senior developer'
};
