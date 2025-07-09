#\!/bin/bash
# Distributed AI Knowledge System - Master Backup
# Created: $(date)

BACKUP_NAME="distributed_ai_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_NAME

echo "🎭 Creating Master Backup: $BACKUP_NAME"

# Copy all relevant files
cp -r *.json *.sh *.py *.md *.sql *.log $BACKUP_NAME/ 2>/dev/null

# Create restoration script
cat > $BACKUP_NAME/restore_system.sh << 'RESTORE'
#\!/bin/bash
echo "🎭 Restoring Distributed AI Knowledge System"
echo "=========================================="

# Restore files
cp *.json *.sh *.py *.md ../ 2>/dev/null
chmod +x ../*.sh

echo "✅ Files restored"
echo ""
echo "To start the system:"
echo "1. RAD: ./distributed_ai_orchestra.sh"
echo "2. REDEYE: ./reconnect_redeye.sh" 
echo "3. RADAR: python3 connect_radar_working.py"
RESTORE

chmod +x $BACKUP_NAME/restore_system.sh

# Create tarball
tar -czf ${BACKUP_NAME}.tar.gz $BACKUP_NAME/
rm -rf $BACKUP_NAME/

echo "✅ Backup created: ${BACKUP_NAME}.tar.gz"
echo "To restore: tar -xzf ${BACKUP_NAME}.tar.gz && cd $BACKUP_NAME && ./restore_system.sh"
EOF < /dev/null