from pathlib import Path
import re
root=Path(__file__).resolve().parent.parent
p=root/'lunar-ui.html'
s=p.read_text(encoding='utf-8')
s=re.sub(r'<style>.*?</style>', '<style>\n<!-- FONTS -->\n<!-- STYLES -->\n</style>',s,count=1,flags=re.S)
s=s.replace('content="#0b1014"','content="#090a0b"')
s=s.replace('<div class="top-actions"><button id="presentation" class="top-action">沉浸展示</button><button id="openSettings" class="top-action primary">画质与设置</button></div>', '''<nav class="top-actions" aria-label="工作台导航">
 <button id="openViews" class="top-action" aria-expanded="false" aria-controls="viewPanel"><span>OBSERVE</span><small>观察视角</small></button>
 <button id="openFloors" class="top-action" aria-expanded="false" aria-controls="floorPanel"><span>MODULES</span><small>楼层调度</small></button>
 <button id="presentation" class="top-action"><span>IMMERSION</span><small>沉浸展示</small></button>
 <button id="openSettings" class="top-action primary"><span>SETTINGS</span><small>画质设置</small></button>
 </nav>''')
s=s.replace('<section class="editorial"><h1>', '<section class="editorial"><div class="eyebrow">LUNAR HABITAT / RECONFIGURABLE</div><h1>')
# Move existing controls without changing their IDs or simulation contracts.
selection=re.search(r' <section class="selection".*?</section>',s,re.S).group()
s=s.replace(selection,'')
traffic=re.search(r' <aside id="trafficPanel".*?</aside>',s,re.S).group()
s=s.replace(traffic,'')
s=s.replace('<div class="view-cluster">','<section id="viewPanel" class="view-cluster" aria-label="观察与分析" hidden><div class="panel-top"><strong>观察与分析</strong><button class="panel-close" data-close-panel aria-label="关闭观察面板">关闭</button></div>')
s=s.replace('</div>\n<div class="inspection-stack">',traffic+'\n</section>\n<section id="floorPanel" class="inspection-stack" aria-label="楼层与房间调度" hidden><div class="panel-top"><strong>楼层与调度</strong><button class="panel-close" data-close-panel aria-label="关闭调度面板">关闭</button></div>')
s=s.replace('</div>\n<div class="scene-caption">',selection+'\n</section>\n<div class="scene-index" aria-hidden="true"><b id="missionIndex">01</b><small>RECONFIGURE / 03</small></div>\n<div class="scene-caption">')
# Render diagnostics belong with quality settings, off the primary canvas.
system=re.search(r' <div class="system-bar".*?</div>',s,re.S).group()
s=s.replace(system,'')
s=s.replace('<h3>光影与显示</h3>','<h3>渲染状态</h3>'+system+'<h3>光影与显示</h3>')
s=s.replace('id="labels" type="checkbox" checked','id="labels" type="checkbox"')
p.write_text(s,encoding='utf-8')
print('Reorganized panels and minimal stage layout.')
