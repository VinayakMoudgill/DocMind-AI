#!/bin/bash
# DocMind AI Pre-Demo Setup Script
# Run this 1 hour before ECLIPSE 6.0 demo to ensure everything is ready

set -e

echo "🚀 DocMind AI Pre-Demo Setup"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker.${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 not found. Please install Python 3.11+.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Create .env file if not exists
echo -e "${YELLOW}Step 2: Checking environment variables...${NC}"

if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from template...${NC}"
    cp .env.example .env
    echo -e "${RED}⚠️  Please fill in .env with your API keys${NC}"
    exit 1
fi

echo -e "${GREEN}✅ .env file found${NC}"

# Build Docker images
echo -e "${YELLOW}Step 3: Building Docker images...${NC}"

docker-compose build --no-cache

echo -e "${GREEN}✅ Docker images built${NC}"

# Start services
echo -e "${YELLOW}Step 4: Starting services...${NC}"

docker-compose up -d

sleep 10

# Check if services are running
echo -e "${YELLOW}Step 5: Verifying services...${NC}"

if curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${GREEN}✅ Backend API is running${NC}"
else
    echo -e "${RED}❌ Backend API failed to start${NC}"
    exit 1
fi

if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend may still be building...${NC}"
fi

# Index war chest (pre-load demo data)
echo -e "${YELLOW}Step 6: Indexing demo datasets...${NC}"

python3 scripts/pre_index_war_chest.py

echo -e "${GREEN}✅ Demo datasets indexed${NC}"

# Final summary
echo ""
echo "==============================================="
echo -e "${GREEN}✅ DocMind AI is ready for demo!${NC}"
echo "==============================================="
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend API: http://localhost:8000"
echo "📍 API Docs: http://localhost:8000/docs"
echo ""
echo "🎯 Next steps:"
echo "  1. Open http://localhost:3000 in browser"
echo "  2. Upload your demo documents"
echo "  3. Test all features (Chat, Exam Lens, Disagreement Detector)"
echo "  4. Have pre-recorded demo video ready"
echo ""
echo "⏰ Demo starts in: 1 hour"
echo ""
