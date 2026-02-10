// Temporary password generator for new employees
export function generateTempPassword(): string {
  const adjectives = ['Smart', 'Quick', 'Happy', 'Bright', 'Swift'];
  const colors = ['Blue', 'Green', 'Gold', 'Silver', 'Azure'];
  const numbers = Math.floor(1000 + Math.random() * 9000);
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  // Format: SmartBlue2024!
  return `${adj}${color}${numbers}!`;
}
