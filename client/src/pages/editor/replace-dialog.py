import re

with open('content.tsx', 'r') as file:
    content = file.read()

with open('../../../dialog-content.txt', 'r') as file:
    dialog_content = file.read()

# Use a regex pattern to find and replace the Dialog component and its content
pattern = r'<Dialog open=\{sendDialogOpen\} onOpenChange=\{setSendDialogOpen\}>.*?</Dialog>'
new_content = re.sub(pattern, dialog_content, content, flags=re.DOTALL)

with open('content.tsx', 'w') as file:
    file.write(new_content)

print("Dialog content replaced successfully")
