#!/bin/bash
# This script loads test data into the database
export PGPASSWORD=password
export PAGER=""  # Disable pager

psql -h localhost -U postgres -d escro_platform < /home/maxx/Desktop/work/test_project_data.sql

echo "Test data script completed"
