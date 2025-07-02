#!/bin/bash

# Fix all files with malformed {const declarations
echo "Fixing malformed const declarations..."

# Use sed to replace all instances of '{const ' with 'const '
find src/ -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i 's/{const /const /g' {} \;

echo "Fixed all occurrences of '{const ' in TypeScript/React files"

# Also fix the export in notifications.ts which has a different pattern
sed -i 's/export {const /export const /g' src/services/notifications.ts

echo "Fixes complete!"