// Debug DTO transformation
const { plainToClass } = require('class-transformer');
const { validate } = require('class-validator');

// Mock the DTO class
class CreateProductDto {
  constructor() {
    this.name = '';
    this.price = 0;
    this.availableUntil = null;
  }
}

// Test data
const testData = {
  name: 'Test Product',
  price: 10000,
  availableUntil: '2025-10-08T10:06:40.905Z'
};

console.log('🔧 Original data:', testData);

// Transform
const dto = plainToClass(CreateProductDto, testData);
console.log('🔧 After transformation:', dto);

// Validate
validate(dto).then(errors => {
  console.log('🔧 Validation errors:', errors);
});
