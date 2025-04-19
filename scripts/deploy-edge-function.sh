#!/bin/bash

# Deployment script for Supabase Edge Functions
echo "Deploying generate-itinerary Edge Function..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running."
  echo "Please start Docker Desktop and try again."
  echo "If you don't have Docker Desktop installed, install it from: https://docs.docker.com/desktop/install/"
  exit 1
fi

# Ensure we're in the project root
cd "$(dirname "$0")/.."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Set the function name
FUNCTION_NAME="generate-itinerary"
FUNCTION_DIR="supabase/functions/$FUNCTION_NAME"

# Check if function exists
if [ ! -d "$FUNCTION_DIR" ]; then
    echo "Error: Function directory $FUNCTION_DIR does not exist"
    exit 1
fi

# Check for configuration file
echo "Checking for edge function configuration..."
if grep -q "TIMEOUT" "$FUNCTION_DIR/index.ts"; then
    echo "✅ Configuration found in index.ts"
else
    echo "⚠️ Warning: Configuration not found in index.ts"
    echo "Make sure TIMEOUT is properly configured"
fi

# Validate Edge Function code
echo "Validating Edge Function code..."
validation_result=$(cd "$FUNCTION_DIR" && deno check index.ts 2>&1)
if [ $? -ne 0 ]; then
    echo "⚠️ Warning: Deno check found issues with the code"
    echo "    $validation_result"
    echo "    Proceeding with deployment anyway..."
else
    echo "✅ Edge Function code validated successfully"
fi
cd - > /dev/null

# Deploy the Edge Function
echo "Deploying Edge Function..."
deploy_result=$(supabase functions deploy "$FUNCTION_NAME" --no-verify-jwt 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ Edge Function deployment failed"
    echo "$deploy_result"
    echo ""
    echo "Troubleshooting:"
    echo "1. Make sure your Supabase CLI is up to date"
    echo "2. Check that your project is linked correctly"
    echo "3. Verify your auth token is still valid with 'supabase status'"
    echo "4. Check the function code for syntax errors"
    exit 1
else
    echo "✅ Edge Function deployed successfully!"
    echo ""
    echo "To verify deployment status:"
    echo "  supabase functions list"
    echo ""
    echo "To test the function:"
    echo "  npm run supabase:test"
fi 