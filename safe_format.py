#!/usr/bin/env python3
import re

def safe_format_xml(content):
    # Add line breaks after each closing tag, but be very careful not to change content
    # Only add line breaks, don't modify any text content
    content = re.sub(r'></', '>\n<', content)
    return content

def main():
    with open('libraries/beetle_formatted.xml', 'r') as f:
        content = f.read()
    
    formatted_content = safe_format_xml(content)
    
    with open('libraries/beetle_formatted.xml', 'w') as f:
        f.write(formatted_content)
    
    print("Applied safe formatting with line breaks")

if __name__ == '__main__':
    main()
