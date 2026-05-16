import React, { useState } from 'react';
import { BookData, PageContent } from '../types';
import { motion } from 'motion/react';
import { CheckCircle2, Download, FileText, ArrowLeft, Loader2, FolderArchive, Zap, Sparkles, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

interface StepProps {
  data: BookData;
  updateData: (updates: Partial<BookData>) => void;
  prevStep: () => void;
}

export function Step5Export({ data, updateData, prevStep }: StepProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPsd, setIsExportingPsd] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const generatePDF = async () => {
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Better rendering container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '210mm';
      document.body.appendChild(container);

      // Utility for basic markdown to HTML for PDF
      const mdToHtml = (md: string) => {
        return md
          .replace(/^# (.*$)/gim, '<h1 style="font-family: serif; font-style: italic; font-size: 32pt; margin-top: 40pt; margin-bottom: 20pt;">$1</h1>')
          .replace(/^## (.*$)/gim, '<h2 style="font-family: serif; font-size: 24pt; margin-top: 30pt; margin-bottom: 15pt;">$1</h2>')
          .replace(/^### (.*$)/gim, '<h3 style="font-family: serif; font-size: 18pt; margin-top: 20pt; margin-bottom: 10pt;">$1</h3>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n/g, '<br/>')
          .replace(/CHECKLIST/g, '<span style="color: #059669; font-weight: bold; border-bottom: 2px solid #059669;">CHECKLIST</span>')
          .replace(/TEMPLATE/g, '<span style="background: #f0fdf4; padding: 10px; border-left: 4px solid #059669; display: block; margin: 20px 0;">TEMPLATE</span>')
          .replace(/MISTAKE TO AVOID/g, '<span style="color: #dc2626; font-weight: bold;">MISTAKE TO AVOID</span>');
      };

      for (let i = 0; i < data.finalPages.length; i++) {
        const page = data.finalPages[i];
        const pageEl = document.createElement('div');
        pageEl.style.width = '210mm';
        pageEl.style.minHeight = '297mm';
        pageEl.style.padding = '80px';
        pageEl.style.backgroundColor = '#fff';
        pageEl.style.color = '#1c1917';
        pageEl.style.display = 'flex';
        pageEl.style.flexDirection = 'column';
        pageEl.className = 'export-page';

        if (page.type === 'cover') {
           pageEl.innerHTML = `
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 20px solid #f5f5f4; padding: 40px;">
              <h1 style="font-family: serif; font-style: italic; font-size: 60pt; line-height: 1; margin-bottom: 20pt; font-weight: 900;">${page.title}</h1>
              <h2 style="font-family: sans-serif; font-size: 14pt; color: #78716c; letter-spacing: 0.3em; text-transform: uppercase; font-weight: 500;">${page.subtitle || ''}</h2>
              <div style="margin-top: 60pt; font-family: serif; font-style: italic; color: #059669; font-size: 18pt;">A Gemini Masterpiece</div>
            </div>
           `;
        } else {
          pageEl.innerHTML = `
            <div style="font-family: serif; position: relative; height: 100%;">
              <div style="position: absolute; top: -40px; right: 0; font-family: monospace; font-size: 8pt; color: #d6d3d1;">PAGE ${i + 1}</div>
              <h1 style="font-family: serif; font-style: italic; font-size: 28pt; font-weight: 800; border-bottom: 1px solid #e7e5e4; padding-bottom: 20px; margin-bottom: 40px;">${page.title}</h1>
              <div style="font-size: 13pt; line-height: 1.8; color: #444; font-family: serif;">${mdToHtml(page.content)}</div>
            </div>
          `;
        }

        container.appendChild(pageEl);
        
        // Optimized capture
        const canvas = await html2canvas(pageEl, { 
          scale: 1.5,
          useCORS: true,
          logging: false
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.85);

        if (i > 0) doc.addPage();
        doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
        
        // Remove from DOM early to save memory
        container.removeChild(pageEl);
      }

      doc.save(`${data.title.replace(/\s+/g, '_')}_Final_Edition.pdf`);
      document.body.removeChild(container);
      setExportComplete(true);
    } catch (err) {
      console.error(err);
      alert("Failed to generate PDF. Try refreshing if the book is very long.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const generatePSDZip = async () => {
    setIsExportingPsd(true);
    try {
      const zip = new JSZip();
      
      // 1. Better structure
      const imgFolder = zip.folder("production_assets");
      const dataFolder = zip.folder("raw_content");

      // 2. Add high-quality image links/manifest
      const manifest: any = {
        title: data.title,
        audience: data.audience,
        pages: data.finalPages.length,
        theme: "Natural Tones / Premium Studio",
        assets: []
      };

      for (const page of data.finalPages) {
        for (const img of page.images) {
          if (img.url) {
            const base64Data = img.url.split(',')[1];
            imgFolder?.file(`${img.id}.png`, base64Data, { base64: true });
            manifest.assets.push({
              pageId: page.id,
              imageId: img.id,
              prompt: img.prompt,
              file: `${img.id}.png`
            });
          }
        }
        dataFolder?.file(`${page.id}.md`, page.content);
      }

      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      zip.file("README_FOR_DESIGNERS.txt", `
EBOOKFORGE PROFESSIONAL ASSET BUNDLE
------------------------------------
Book: ${data.title}
Target: High-End Print & Digital Distribution

CONTENTS:
/production_assets  -> All generated images in high resolution.
/raw_content        -> Markdown source files for every page.
/ebook.jsx          -> Photoshop CC Automation Script.

HOW TO USE THE PHOTOSHOP SCRIPT:
1. Open Adobe Photoshop CC.
2. Go to File > Scripts > Browse...
3. Select 'ebook.jsx' from this folder.
4. The script will automatically build your A4 Master Document layers.
5. Place the images from /production_assets into the designated Smart Object layers.

Note: This bundle is designed for professional design teams using CMYK workflows.
`);

      // 3. Robust JSX Script
      const jsx = `
        /**
         * EBOOKFORGE PROFESSIONAL MASTER SCRIPT
         * Version: 2.1 (Advanced Production Management)
         * 
         * This script automates the creation of a multi-page master document.
         * KEY FEATURES:
         * - Auto-pagination
         * - Visual Asset Smart Groups
         * - Layer Comps for rapid design review
         * - CMYK Production-ready canvas (300DPI)
         */
        app.preferences.rulerUnits = Units.PIXELS;

        var bookTitle = "${data.title.replace(/"/g, "'")}";
        var doc = app.documents.add(2480, 3508, 300, bookTitle + " - Master Production", NewDocumentMode.CMYK);
        
        /**
         * Creates a structured page with background, text, and image placeholders.
         */
        function createMasterLayer(name, title, content, imgId, prompt) {
          // Create Group for this specific page
          var group = doc.layerSets.add();
          group.name = name;
          group.visible = false; // Hidden by default; visibility controlled by Layer Comps

          // 1. BACKGROUND / CANVAS BASE
          var bgLayer = group.artLayers.add();
          bgLayer.name = "Page_Background_Base";
          doc.selection.selectAll();
          var color = new SolidColor();
          color.cmyk.cyan = 0; color.cmyk.magenta = 1; color.cmyk.yellow = 2; color.cmyk.black = 1; // Slight warm off-white
          doc.selection.fill(color);
          doc.selection.deselect();

          // 2. MASTER HEADING
          var titleLayer = group.artLayers.add();
          titleLayer.kind = LayerKind.TEXT;
          titleLayer.name = "HEADING_EDIT_ME";
          var ti = titleLayer.textItem;
          ti.contents = title;
          ti.size = 64;
          ti.font = "Georgia-Italic"; // Standard serif; replace with custom brand font
          ti.position = [200, 400];
          ti.antiAliasMethod = AntiAlias.STRONG;

          // 3. BODY TEXT (CONTENT)
          var contentLayer = group.artLayers.add();
          contentLayer.kind = LayerKind.TEXT;
          contentLayer.name = "BODY_COPY_EDIT_ME";
          var ci = contentLayer.textItem;
          ci.contents = content.substring(0, 1500) + "...";
          ci.size = 18;
          ci.font = "Georgia";
          ci.position = [200, 700];
          ci.width = 2080; 
          ci.antiAliasMethod = AntiAlias.SMOOTH;

          // 4. VISUAL ASSET PLACEMENT
          if (imgId) {
            var imgGroup = group.layerSets.add();
            imgGroup.name = "ASSETS_MODULE";
            
            // Instruction layer for designers
            var noteLayer = imgGroup.artLayers.add();
            noteLayer.kind = LayerKind.TEXT;
            noteLayer.name = "DESIGNER_NOTE";
            var ni = noteLayer.textItem;
            ni.contents = "PRODUCTION GUIDE:\\n1. Locate production_assets/" + imgId + ".png\\n2. Drag into the 'PLACEMENT' layer below\\n3. AI Visual Theme: " + prompt;
            ni.size = 12;
            ni.font = "Verdana";
            ni.position = [200, 2800];
            
            // Placement Placeholder
            var box = imgGroup.artLayers.add();
            box.name = "PLACEMENT_HOLDER";
            doc.selection.select([[200, 1500], [2280, 1500], [2280, 2710], [200, 2710]]);
            var grey = new SolidColor();
            grey.cmyk.black = 10;
            doc.selection.fill(grey);
            doc.selection.deselect();
          }
          
          return group;
        }

        // --- GLOBAL PRODUCTION RUN ---
        
        var pages = [];
${data.finalPages.map((p, i) => `
        var group_${i} = createMasterLayer("P${i+1}_${p.type.toUpperCase()}", "${p.title.replace(/"/g, "'")}", "${p.content.replace(/\r?\n/g, " ").replace(/"/g, "'").slice(0, 2000)}", "${p.images[0]?.id || ''}", "${p.images[0]?.prompt.replace(/"/g, "'") || 'No prompt'}");
        pages.push(group_${i});
`).join('\n')}

        // 5. LAYER COMP GENERATION
        // This allows the designer to toggle between "Pages" instantly using the Layer Comps panel.
        for (var j = 0; j < pages.length; j++) {
            // State reset
            for (var k = 0; k < pages.length; k++) pages[k].visible = false;
            
            // State application
            pages[j].visible = true;
            
            // Snapshot
            doc.layerComps.add("Page " + (j+1) + " Layout", "Automated production snapshot for " + pages[j].name, true, true, true);
        }

        alert("FORGE MASTER COMPLETE!\\n\\nNext Steps:\\n1. Open window > Layer Comps to review all pages.\\n2. Replace PLACEMENT_HOLDER layers with assets from /production_assets.\\n3. Resolution is set to 300DPI for high-end print.");
      `;

      zip.file("ebook.jsx", jsx);
      
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `${data.title.replace(/\s+/g, '_')}_PROFESSIONAL_BUNDLE.zip`;
      link.click();
      setExportComplete(true);
    } catch (err) {
      console.error(err);
      alert("Failed to generate Professional ZIP.");
    } finally {
      setIsExportingPsd(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-16">
        <div className="w-24 h-24 bg-natural-green/10 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto rotate-3 shadow-sm">
          <CheckCircle2 className="text-natural-green w-12 h-12" />
        </div>
        <h1 className="text-5xl font-black tracking-tighter mb-4 serif italic">Masterpiece Forged.</h1>
        <p className="text-xl text-gray-400 max-w-xl mx-auto leading-relaxed">
          Your book "{data.title}" is ready for the world. Download your professional assets below.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
        <button
          onClick={generatePDF}
          disabled={isExportingPdf || isExportingPsd}
          className="group relative bg-white border border-natural-border/30 rounded-[2.5rem] p-12 text-left hover:shadow-2xl hover:border-natural-green transition-all flex flex-col gap-8 disabled:opacity-50"
        >
          <div className="w-14 h-14 bg-natural-bg rounded-2xl flex items-center justify-center group-hover:bg-natural-green group-hover:text-white transition-all">
             {isExportingPdf ? <Loader2 className="w-8 h-8 animate-spin" /> : <Download className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2 serif italic">Download PDF</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Print-ready, pixel perfect PDF document with all your custom images and master typography.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-300">
             <FileText className="w-4 h-4" /> Ready for publishing
          </div>
        </button>

        <button
          onClick={generatePSDZip}
          disabled={isExportingPdf || isExportingPsd}
          className="group relative bg-white border border-natural-border/30 rounded-[2.5rem] p-12 text-left hover:shadow-2xl hover:border-emerald-500 transition-all flex flex-col gap-8 disabled:opacity-50"
        >
          <div className="w-14 h-14 bg-natural-bg rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
             {isExportingPsd ? <Loader2 className="w-8 h-8 animate-spin" /> : <FolderArchive className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2 serif italic">Professional ZIP</h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Contains all raw assets + a Photoshop automation script for advanced designer adjustments.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-300">
             < Zap className="w-4 h-4" /> FOR DESIGN TEAMS
          </div>
        </button>
      </div>

      {exportComplete && (
        <motion.div 
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         className="bg-natural-green/5 border border-natural-green/20 p-8 rounded-[2.5rem] text-center mb-16"
        >
           <h4 className="text-natural-green font-bold mb-1 serif">Export Successful!</h4>
           <p className="text-natural-green/70 text-sm font-medium">Your files have been forged and provided. What's next?</p>
        </motion.div>
      )}

      <div className="flex items-center justify-between border-t border-natural-border mt-12 pt-12">
         <button 
          onClick={prevStep}
          className="flex items-center gap-2 font-bold text-gray-400 hover:text-natural-text transition-colors"
         >
           <ArrowLeft className="w-5 h-5" /> Back to Designer
         </button>
         
         <div className="flex items-center gap-6">
            <div className="text-right">
               <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Share Forge</p>
               <p className="text-xs font-bold text-gray-400">Coming Soon</p>
            </div>
            <button 
             onClick={() => window.location.reload()}
             className="px-8 py-4 bg-natural-text text-white rounded-full font-bold flex items-center gap-3 hover:opacity-90 transition-all shadow-xl shadow-natural-text/10"
            >
              <Sparkles className="w-5 h-5 text-natural-green" /> Create Another
            </button>
         </div>
      </div>
    </div>
  );
}
