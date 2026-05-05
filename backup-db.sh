#!/bin/bash
DB_PATH="/opt/lexiujiang/backend/data/lexiujiang.db"
BACKUP_DIR="/opt/lexiujiang/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lexiujiang_$DATE.db"

mkdir -p "$BACKUP_DIR"
cp "$DB_PATH" "$BACKUP_FILE"
gzip "$BACKUP_FILE"

# 删除7天前的备份
find "$BACKUP_DIR" -name "lexiujiang_*.db.gz" -mtime +7 -delete

echo "备份完成: $BACKUP_FILE.gz"
