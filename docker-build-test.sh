#!/bin/bash

# Docker Build & Validation Script for Phase 6
# This verifies that all containers build successfully

echo "🐳 OursMusic Docker Build & Verification"
echo "==========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BUILD_FAILED=0

# Test 1: Backend Dockerfile
echo -e "${YELLOW}[1/3]${NC} Testing Backend Dockerfile build..."
if docker build -t oursmusic-backend:test ./backend --quiet 2>&1 | tail -5; then
    echo -e "${GREEN}✓ Backend build successful${NC}"
else
    echo -e "${RED}✗ Backend build failed${NC}"
    BUILD_FAILED=1
fi
echo ""

# Test 2: Web Dockerfile
echo -e "${YELLOW}[2/3]${NC} Testing Web Dockerfile build..."
if docker build -t oursmusic-web:test ./web --quiet 2>&1 | tail -5; then
    echo -e "${GREEN}✓ Web build successful${NC}"
else
    echo -e "${RED}✗ Web build failed${NC}"
    BUILD_FAILED=1
fi
echo ""

# Test 3: Docker Compose validation
echo -e "${YELLOW}[3/3]${NC} Validating Docker Compose configuration..."
if docker-compose config -f docker-compose.yml > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Docker Compose validation successful${NC}"
else
    echo -e "${RED}✗ Docker Compose validation failed${NC}"
    BUILD_FAILED=1
fi
echo ""

# Summary
echo "==========================================="
if [ $BUILD_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All builds and validations passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  docker-compose up -d          # Start all services"
    echo "  docker ps                     # Check running containers"
    echo "  docker logs oursmusic-backend # View backend logs"
    exit 0
else
    echo -e "${RED}✗ Some builds or validations failed${NC}"
    exit 1
fi
