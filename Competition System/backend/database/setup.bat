@echo off
chcp 65001
echo ========================================
echo    竞赛管理系统 - 数据库初始化脚本
echo ========================================
echo.
echo 请确保 phpStudy 的 MySQL 8 服务已启动
echo 默认配置: root / 123456
echo.

set /p confirm=是否继续? (Y/N): 
if /i not "%confirm%"=="Y" goto :end

echo.
echo [1/2] 创建数据库结构...
mysql -u root -p123456 < schema.sql
if errorlevel 1 (
    echo 错误: 数据库结构创建失败!
    echo 请检查 MySQL 是否正常运行以及密码是否正确
    pause
    exit /b 1
)
echo 数据库结构创建成功!

echo.
echo [2/2] 导入初始数据...
mysql -u root -p123456 < seed.sql
if errorlevel 1 (
    echo 错误: 初始数据导入失败!
    pause
    exit /b 1
)
echo 初始数据导入成功!

echo.
echo ========================================
echo    数据库初始化完成!
echo ========================================
echo.
echo 默认账户:
echo   超级管理员: admin / admin123
echo   校级管理员: school001 / 123456
echo   院级管理员: dept001 / 123456
echo   教师账户: teacher001 / 123456
echo.

:end
pause
