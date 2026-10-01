import markdown as md

index = open('index.md','r', encoding='utf-8').read()
index_html = open('index.html','r').read()
print(index_html)
print(md.markdown(index))

