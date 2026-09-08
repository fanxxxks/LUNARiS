from pathlib import Path
import importlib.util, os, subprocess, shutil
QA=Path(__file__).resolve().parent
ROOT=QA.parents[1]
DOC=ROOT/'可重构月球科研站_自主对接母港方案_V5.docx'
PDF=QA/'word_export.pdf'
RENDER=Path('C:/Users/Lenovo/.codex/plugins/cache/openai-primary-runtime/documents/26.905.11957/skills/documents/render_docx.py')
POPPLER=Path('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin')
os.environ['PATH']=str(POPPLER)+os.pathsep+os.environ['PATH']
subprocess.run(['powershell.exe','-NoProfile','-ExecutionPolicy','Bypass','-File',str(ROOT/'.codex-review/v4-docx/export_word_pdf.ps1'),'-InputDocument',str(DOC),'-OutputPdf',str(PDF)],check=True,timeout=120)
spec=importlib.util.spec_from_file_location('render_docx',RENDER)
renderer=importlib.util.module_from_spec(spec);spec.loader.exec_module(renderer)
def word_pdf(doc_path,user_profile,convert_tmp_dir,stem,verbose):
    target=Path(convert_tmp_dir)/(stem+'.pdf');shutil.copyfile(PDF,target)
    return str(target),'Word-compatible COM export used because the Windows runtime has no bundled LibreOffice.'
renderer.convert_to_pdf=word_pdf
renderer.rasterize(str(DOC),str(QA/'render'),144,verbose=True,emit_pdf=True)
print('RENDER_COMPLETE')
