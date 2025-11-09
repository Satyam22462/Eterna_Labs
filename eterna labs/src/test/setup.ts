// Test setup file
// This file runs before all tests

process.env.NODE_ENV = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.POSTGRES_HOST = 'localhost';
process.env.POSTGRES_PORT = '5432';
process.env.POSTGRES_USER = 'postgres';
process.env.POSTGRES_PASSWORD = 'postgres';
process.env.POSTGRES_DB = 'order_engine_test';


