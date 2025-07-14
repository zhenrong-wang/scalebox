#!/usr/bin/env python3
"""
Script to fix mixed Traditional Chinese characters in the i18n.ts file.
This script identifies Simplified Chinese characters in the Traditional Chinese section
and replaces them with proper Traditional Chinese equivalents.
"""

import re
import sys

def fix_traditional_chinese():
    """Fix mixed Traditional Chinese characters in i18n.ts"""
    
    # Read the file
    with open('front-end/lib/i18n.ts', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Define the fixes - Simplified Chinese to Traditional Chinese mappings
    fixes = {
        # Common character mappings
        '搜索': '搜尋',
        '当前': '目前',
        '导出': '匯出',
        '内存': '記憶體',
        '存储': '儲存',
        '标记': '標記',
        '选中': '選中',
        '删除': '刪除',
        '用户': '使用者',
        '刚刚': '剛剛',
        '分钟': '分鐘',
        '小时': '小時',
        '天前': '天前',  # This is already correct
        '全选': '全選',
        '清除': '清除',  # This is already correct
        '周期': '週期',
        '运行': '執行',
        '阈值': '閾值',
        '项目': '專案',
        '模板': '範本',
        '创建': '建立',
        '编辑': '編輯',
        '保存': '儲存',
        '名称': '名稱',
        '描述': '描述',  # This is already correct
        '类别': '類別',
        '语言': '語言',
        '要求': '要求',  # This is already correct
        '标签': '標籤',
        '公开': '公開',
        '官方': '官方',  # This is already correct
        '私有': '私有',  # This is already correct
        '筛选': '篩選',
        '类型': '類型',
        '所有': '所有',  # This is already correct
        '列表': '清單',
        '星标': '星標',
        '下载': '下載',
        '时间': '時間',
        '操作': '操作',  # This is already correct
        '使用': '使用',  # This is already correct
        '查看': '檢視',
        '仓库': '儲存庫',
        '成功': '成功',  # This is already correct
        '失败': '失敗',
        '部分': '部分',  # This is already correct
        '未读': '未讀',
        '已读': '已讀',
        '通知': '通知',  # This is already correct
        '批次': '批次',  # This is already correct
        '清空': '清空',  # This is already correct
        '全部': '全部',  # This is already correct
        '错误': '錯誤',
        '加载': '載入',
        '正在': '正在',  # This is already correct
        '暂无': '暫無',
        '新': '新',  # This is already correct
        '标记为': '標記為',
        '删除选中': '刪除選中',
        '已删除': '已刪除',
        '删除失败': '刪除失敗',
        '标记为已读': '標記為已讀',
        '标记为未读': '標記為未讀',
        '选中的通知': '選中的通知',
        '批次标记为已读': '批次標記為已讀',
        '批次标记为未读': '批次標記為未讀',
        '批次删除': '批次刪除',
        '已清空全部': '已清空全部',
        '所有通知': '所有通知',
        '清空全部通知': '清空全部通知',
        '标记通知为已读失败': '標記通知為已讀失敗',
        '标记通知为未读失败': '標記通知為未讀失敗',
        '删除通知失败': '刪除通知失敗',
        '批次标记为已读失败': '批次標記為已讀失敗',
        '批次标记为未读失败': '批次標記為未讀失敗',
        '批次删除失败': '批次刪除失敗',
        '清空全部通知失败': '清空全部通知失敗',
        'No notifications': '暫無通知',
        '分钟前': '分鐘前',
        '小时前': '小時前',
        '删除选中': '刪除選中',
        '清除全部': '清除全部',
    }
    
    # Find the Traditional Chinese section
    zh_tw_start = content.find('"zh-TW": {')
    if zh_tw_start == -1:
        print("Could not find Traditional Chinese section")
        return
    
    # Find the end of the Traditional Chinese section (next language or end of file)
    zh_tw_end = content.find('},', zh_tw_start)
    if zh_tw_end == -1:
        zh_tw_end = len(content)
    
    # Extract the Traditional Chinese section
    zh_tw_section = content[zh_tw_start:zh_tw_end]
    
    # Apply fixes
    fixed_section = zh_tw_section
    for simplified, traditional in fixes.items():
        fixed_section = fixed_section.replace(simplified, traditional)
    
    # Replace the section in the original content
    new_content = content[:zh_tw_start] + fixed_section + content[zh_tw_end:]
    
    # Write back to file
    with open('front-end/lib/i18n.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("Fixed Traditional Chinese character mixing in i18n.ts")

if __name__ == "__main__":
    fix_traditional_chinese() 