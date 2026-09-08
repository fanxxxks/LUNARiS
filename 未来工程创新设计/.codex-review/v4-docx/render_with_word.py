from pathlib import Path
import importlib.util, os, subprocess, shutil
QA=Path(__file__).resolve().parent
ROOT=QA.parents[1]
DOC=ROOT/'可重构月球科研站_巨构框架方案_V4.docx'
PDF=QA/'word_export.pdf'
RENDER=Path('C:/Users/Lenovo/.codex/plugins/cache/openai-primary-runtime/documents/26.905.11957/skills/documents/render_docx.py')
POPLER=Path('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin')
os.environ['PATH']=str(POPLER)+os.pathsep+os.environ['PATH']
subprocess.run(['powershell.exe','-NoProfile','-ExecutionPolicy','Bypass','-File',str(QA/'export_word_pdf.ps1'),'-InputDocument',str(DOC),'-OutputPdf',str(PDF)],check=True,timeout=120)
spec=importlib.util.spec_from_file_location('render_docx',RENDER)
renderer=importlib.util.module_from_spec(spec);spec.loader.exec_module(renderer)
def word_pdf(doc_path,user_profile,convert_tmp_dir,stem,verbose):
    target=Path(convert_tmp_dir)/(stem+'.pdf');shutil.copyfile(PDF,target)
    return str(target),'Windows Word COM PDF export used because bundled LibreOffice is unavailable.'
renderer.convert_to_pdf=word_pdf
renderer.rasterize(str(DOC),str(QA/'render'),144,verbose=True,emit_pdf=True)
print('RENDER_COMPLETE')
