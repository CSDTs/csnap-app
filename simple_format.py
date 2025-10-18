#!/usr/bin/env python3
import re

def simple_format_xml(content):
    # Add line breaks after each closing tag to make it more readable
    # This preserves the original tag format exactly
    content = re.sub(r'><', '>\n<', content)
    content = re.sub(r'^<', '<', content, flags=re.MULTILINE)
    return content

def main():
    with open('libraries/beetle.xml', 'r') as f:
        content = f.read()
    
    formatted_content = simple_format_xml(content)
    
    with open('libraries/beetle_formatted.xml', 'w') as f:
        f.write(formatted_content)
    
    print("Created beetle_formatted.xml with simple line breaks")

if __name__ == '__main__':
    main()
