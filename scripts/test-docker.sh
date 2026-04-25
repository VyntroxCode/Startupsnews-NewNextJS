#!/bin/bash

# Docker Connection Test Script (Bash version)
# Tests Docker container status and basic connectivity

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Docker Services Status Check          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# Check if Docker is running
echo -e "${CYAN}Checking Docker daemon...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon is not running${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker daemon is running${NC}\n"

# Check if Docker Compose is available
echo -e "${CYAN}Checking Docker Compose...${NC}"
if ! docker-compose --version > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose is not available${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose is available${NC}\n"

# Check container status
echo -e "${CYAN}Checking container status...${NC}\n"

containers=("zox-mariadb" "zox-redis" "zox-adminer" "zox-redis-commander")

for container in "${containers[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        status=$(docker inspect --format='{{.State.Status}}' "${container}" 2>/dev/null)
        health=$(docker inspect --format='{{.State.Health.Status}}' "${container}" 2>/dev/null)
        
        if [ "$status" = "running" ]; then
            if [ "$health" = "healthy" ] || [ -z "$health" ]; then
                echo -e "${GREEN}✅ ${container}: Running${NC}"
                if [ -n "$health" ]; then
                    echo -e "   Health: ${GREEN}${health}${NC}"
                fi
            else
                echo -e "${YELLOW}⚠️  ${container}: Running (${health})${NC}"
            fi
        else
            echo -e "${RED}❌ ${container}: ${status}${NC}"
        fi
    else
        echo -e "${RED}❌ ${container}: Not found${NC}"
    fi
done

echo ""

# Test MariaDB connection
echo -e "${CYAN}Testing MariaDB connection...${NC}"
if docker exec zox-mariadb mariadb -uzox_user -pzox_password zox_db -e "SELECT 1" > /dev/null 2>&1; then
    version=$(docker exec zox-mariadb mariadb -uzox_user -pzox_password zox_db -e "SELECT VERSION()" 2>/dev/null | tail -n 1)
    echo -e "${GREEN}✅ MariaDB: Connected${NC}"
    echo -e "   Version: ${version}"
else
    echo -e "${RED}❌ MariaDB: Connection failed${NC}"
fi

# Test Redis connection
echo -e "\n${CYAN}Testing Redis connection...${NC}"
if docker exec zox-redis redis-cli ping > /dev/null 2>&1; then
    version=$(docker exec zox-redis redis-cli --version 2>/dev/null | cut -d' ' -f2)
    echo -e "${GREEN}✅ Redis: Connected${NC}"
    echo -e "   Version: ${version}"
else
    echo -e "${RED}❌ Redis: Connection failed${NC}"
fi

# Test HTTP services
echo -e "\n${CYAN}Testing HTTP services...${NC}"

# Test Adminer
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ Adminer: Accessible at http://localhost:8080${NC}"
else
    echo -e "${RED}❌ Adminer: Not accessible${NC}"
fi

# Test Redis Commander
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8081 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ Redis Commander: Accessible at http://localhost:8081${NC}"
else
    echo -e "${RED}❌ Redis Commander: Not accessible${NC}"
fi

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Summary                               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "To start services: ${CYAN}docker-compose up -d${NC}"
echo -e "To stop services: ${CYAN}docker-compose down${NC}"
echo -e "To view logs: ${CYAN}docker-compose logs -f${NC}"
echo ""

