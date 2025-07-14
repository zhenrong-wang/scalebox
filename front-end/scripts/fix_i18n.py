#!/usr/bin/env python3
"""
Comprehensive i18n.ts Translation Checker and Fixer
This script analyzes the i18n.ts file and ensures all English keys have proper
Simplified and Traditional Chinese translations.
"""

import re
import json
import os
import sys
from typing import Dict, List, Set, Tuple
from collections import defaultdict
from opencc import OpenCC

def load_i18n_file(file_path: str) -> Dict[str, Dict[str, str]]:
    """Load and parse the i18n.ts file using line-by-line parsing."""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    translations = {'en': {}, 'zh-CN': {}, 'zh-TW': {}}
    current_lang = None
    in_translations = False
    
    for line in lines:
        line = line.strip()
        
        # Check if we're entering the translations object
        if 'export const translations' in line:
            in_translations = True
            continue
        
        if not in_translations:
            continue
        
        # Check for language sections
        if '"en":' in line:
            current_lang = 'en'
            continue
        elif '"zh-CN":' in line:
            current_lang = 'zh-CN'
            continue
        elif '"zh-TW":' in line:
            current_lang = 'zh-TW'
            continue
        
        # Check if we're exiting the translations object
        if line.startswith('};') and in_translations:
            break
        
        # Parse translation lines
        if current_lang and line.startswith('"') and '":' in line:
            # Extract key and value
            match = re.match(r'"([^"]+)":\s*"([^"]*)"', line)
            if match:
                key, value = match.groups()
                translations[current_lang][key] = value
    
    return translations

def detect_chinese_variant(text: str) -> str:
    """Detect if text is Simplified Chinese, Traditional Chinese, or mixed."""
    if not text:
        return "empty"
    
    # Simplified Chinese characters (common)
    simplified_chars = set('这那为时来会国中到作和地出也分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之在着有的一是我不人他上们来到时大地为子中你说生国年着就那和要她出也得里后自以会家可下而过天去能对小多然于心学么之都好看起发当没成只如事把还用第样道想作种开美总从无情己面最女但现前些所同日手又行意动方期它头经长儿回位分爱老因很给名法间斯知世什两次使身者被高已亲其进此话常与活正感见明问力理尔点文几定本公特做外孩相西果走将月十实向声车全信重三机工物气每并别真打太新比才便夫再书部水像眼等体却加电主界门利海受听表德少克代员许稜先口由')
    
    # Traditional Chinese characters (common)
    traditional_chars = set('這那為時來會國中到作和地出也分對成會可主發年動同工也能下過子說產種面而方後多定行學法所民得經十三之在著有的一是我不人他上們來到時大地為子中你說生國年著就那和要她出也得裡後自以會家可下而過天去能對小多然於心學麼之都好看起發當沒成只如事把還用第樣道想作種開美總從無情己面最女但現前些所同日手又行意動方期它頭經長兒回位分愛老因很給名法間斯知世什兩次使身者被高已親其進此話常與活正感見明問力理爾點文幾定本公特做外孩相西果走將月十實向聲車全信重三機工物氣每並別真打太新比才便夫再書部水像眼等體卻加電主界門利海受聽表德少克代員許稜先口由')
    
    # Count characters
    simplified_count = sum(1 for char in text if char in simplified_chars)
    traditional_count = sum(1 for char in text if char in traditional_chars)
    
    if simplified_count > traditional_count:
        return "simplified"
    elif traditional_count > simplified_count:
        return "traditional"
    else:
        return "mixed"

def analyze_translations(translations: Dict[str, Dict[str, str]]) -> Dict[str, List[str]]:
    """Analyze translations and find issues."""
    issues = {
        'missing_keys': [],
        'traditional_in_simplified': [],
        'simplified_in_traditional': [],
        'empty_translations': [],
        'mixed_chinese': []
    }
    
    english_keys = set(translations.get('en', {}).keys())
    simplified_keys = set(translations.get('zh-CN', {}).keys())
    traditional_keys = set(translations.get('zh-TW', {}).keys())
    
    # Check for missing keys
    missing_in_simplified = english_keys - simplified_keys
    missing_in_traditional = english_keys - traditional_keys
    
    issues['missing_keys'].extend([f"zh-CN missing: {key}" for key in missing_in_simplified])
    issues['missing_keys'].extend([f"zh-TW missing: {key}" for key in missing_in_traditional])
    
    # Check for wrong Chinese variants
    for key in simplified_keys:
        if key in translations['zh-CN']:
            text = translations['zh-CN'][key]
            variant = detect_chinese_variant(text)
            if variant == "traditional":
                issues['traditional_in_simplified'].append(f"{key}: {text}")
            elif variant == "mixed":
                issues['mixed_chinese'].append(f"zh-CN {key}: {text}")
    
    for key in traditional_keys:
        if key in translations['zh-TW']:
            text = translations['zh-TW'][key]
            variant = detect_chinese_variant(text)
            if variant == "simplified":
                issues['simplified_in_traditional'].append(f"{key}: {text}")
            elif variant == "mixed":
                issues['mixed_chinese'].append(f"zh-TW {key}: {text}")
    
    # Check for empty translations
    for lang, lang_translations in translations.items():
        for key, value in lang_translations.items():
            if not value.strip():
                issues['empty_translations'].append(f"{lang} {key}: empty")
    
    return issues

def generate_report(issues: Dict[str, List[str]], translations: Dict[str, Dict[str, str]]) -> str:
    """Generate a comprehensive report."""
    report = []
    report.append("=" * 80)
    report.append("I18N TRANSLATION ANALYSIS REPORT")
    report.append("=" * 80)
    
    # Summary
    en_count = len(translations.get('en', {}))
    zh_cn_count = len(translations.get('zh-CN', {}))
    zh_tw_count = len(translations.get('zh-TW', {}))
    
    report.append(f"\nSUMMARY:")
    report.append(f"English keys: {en_count}")
    report.append(f"Simplified Chinese keys: {zh_cn_count}")
    report.append(f"Traditional Chinese keys: {zh_tw_count}")
    
    # Issues
    for issue_type, issue_list in issues.items():
        if issue_list:
            report.append(f"\n{issue_type.upper().replace('_', ' ')} ({len(issue_list)}):")
            for issue in issue_list[:20]:  # Show first 20 issues
                report.append(f"  - {issue}")
            if len(issue_list) > 20:
                report.append(f"  ... and {len(issue_list) - 20} more")
    
    return "\n".join(report)

def batch_convert_zh_cn(translations: Dict[str, Dict[str, str]]) -> List[Tuple[str, str, str]]:
    cc = OpenCC('t2s')
    changes = []
    for key, value in translations['zh-CN'].items():
        converted = cc.convert(value)
        if value != converted:
            changes.append((key, value, converted))
    print(f"\nWould convert {len(changes)} zh-CN values from Traditional to Simplified Chinese:")
    for key, old, new in changes[:20]:
        print(f"  {key}: {old} -> {new}")
    if len(changes) > 20:
        print(f"  ... and {len(changes) - 20} more")
    return changes

def apply_zh_cn_fixes(file_path: str, changes: List[Tuple[str, str, str]]):
    """Apply the Traditional to Simplified Chinese conversions to the file."""
    print(f"\nApplying {len(changes)} fixes to {file_path}...")
    
    # Read the file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Apply changes
    modified_content = content
    for key, old_value, new_value in changes:
        # Escape special regex characters in the old value
        escaped_old = re.escape(old_value)
        pattern = f'"{key}":\s*"{escaped_old}"'
        replacement = f'"{key}": "{new_value}"'
        
        # Find and replace
        if re.search(pattern, modified_content):
            modified_content = re.sub(pattern, replacement, modified_content)
            print(f"  Fixed: {key}")
        else:
            print(f"  Warning: Could not find pattern for {key}")
    
    # Write back to file
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(modified_content)
    
    print(f"Successfully applied {len(changes)} fixes!")

def main():
    """Main function to run the analysis."""
    i18n_file = "lib/i18n.ts"
    
    # Check for --apply-fix argument
    apply_fix = "--apply-fix" in sys.argv
    
    if not os.path.exists(i18n_file):
        print(f"Error: {i18n_file} not found!")
        return
    
    print("Loading i18n.ts file...")
    try:
        translations = load_i18n_file(i18n_file)
        print(f"Loaded translations: EN={len(translations.get('en', {}))}, ZH-CN={len(translations.get('zh-CN', {}))}, ZH-TW={len(translations.get('zh-TW', {}))}")
    except Exception as e:
        print(f"Error loading file: {e}")
        return
    
    print("Analyzing translations...")
    issues = analyze_translations(translations)
    
    print("Generating report...")
    report = generate_report(issues, translations)
    print(report)
    
    # Save report to file
    with open("i18n_analysis_report.txt", "w", encoding="utf-8") as f:
        f.write(report)
    
    print(f"\nReport saved to i18n_analysis_report.txt")
    
    # Show specific billing issues
    billing_issues = []
    for key, value in translations.get('zh-CN', {}).items():
        if key.startswith('billings.') and detect_chinese_variant(value) == "traditional":
            billing_issues.append(f"{key}: {value}")
    
    if billing_issues:
        print(f"\nBILLING ISSUES IN SIMPLIFIED CHINESE ({len(billing_issues)}):")
        for issue in billing_issues:
            print(f"  - {issue}")

    print("\nBatch converting zh-CN values from Traditional to Simplified Chinese...")
    changes = batch_convert_zh_cn(translations)
    
    if apply_fix and changes:
        apply_zh_cn_fixes(i18n_file, changes)
    elif changes:
        print(f"\nTo apply these fixes, run: python3 scripts/fix_i18n.py --apply-fix")

if __name__ == "__main__":
    main() 