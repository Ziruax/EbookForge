import React, { useState } from 'react';
import { BookData, PageContent } from '../types';
import { motion } from 'motion/react';
import { CheckCircle2, Download, FileText, ArrowLeft, Loader2, FolderArchive, Zap, Sparkles, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
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

  const isHeadingSerif = !data.settings || data.settings.headingFont.includes('serif') || data.settings.headingFont.includes('playfair') || data.settings.headingFont.includes('crimson');
  const isBodySerif = !data.settings || data.settings.bodyFont.includes('serif') || data.settings.bodyFont.includes('lora');
  
  const headingPDF = isHeadingSerif ? 'times' : 'helvetica';
  const bodyPDF = isBodySerif ? 'times' : 'helvetica';

  const generatePDF = async () => {
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const margin = 25;
      const topMargin = 30;
      const bottomMargin = 25;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const contentWidth = pageWidth - (margin * 2);
      
      const addPageNumber = (pageNumber: number) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.text(`PAGE ${pageNumber}`, pageWidth - margin, bottomMargin / 2, { align: 'right' });
      };

      const renderMarkdown = async (content: string, startY: number, pageNum: number) => {
        let cursorY = startY;
        let currentPage = pageNum;
        
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          let line = lines[i].trim();
          if (!line && !lines[i].startsWith(' ')) {
            cursorY += 5;
            continue;
          }

          // Page Check
          if (cursorY > pageHeight - bottomMargin - 10) {
            doc.addPage();
            currentPage++;
            addPageNumber(currentPage);
            cursorY = topMargin;
          }

          // Headings
          if (line.startsWith('## ')) {
            doc.setFont(headingPDF, isHeadingSerif ? 'italic' : 'bold');
            doc.setFontSize(22);
            doc.setTextColor(20, 20, 20);
            cursorY += 10;
            const text = line.replace('## ', '');
            const splitText = doc.splitTextToSize(text, contentWidth);
            doc.text(splitText, margin, cursorY);
            cursorY += (splitText.length * 10) + 5;
            // Aesthetic underline
            doc.setDrawColor(5, 150, 105, 0.2);
            doc.line(margin, cursorY - 2, margin + 20, cursorY - 2);
            cursorY += 5;
            continue;
          }

          if (line.startsWith('### ')) {
            doc.setFont(headingPDF, isHeadingSerif ? 'bolditalic' : 'bold');
            doc.setFontSize(16);
            doc.setTextColor(40, 40, 40);
            cursorY += 8;
            const text = line.replace('### ', '');
            const splitText = doc.splitTextToSize(text, contentWidth);
            doc.text(splitText, margin, cursorY);
            cursorY += (splitText.length * 8) + 4;
            continue;
          }

          // Horizontal Rule
          if (line === '---' || line === '***') {
            doc.setDrawColor(230, 230, 230);
            doc.line(margin, cursorY + 5, pageWidth - margin, cursorY + 5);
            cursorY += 15;
            continue;
          }

          // List Items
          if (line.startsWith('* ') || line.startsWith('- ')) {
            doc.setFont(bodyPDF, 'normal');
            doc.setFontSize(11);
            doc.setTextColor(60, 60, 60);
            const text = "• " + line.substring(2);
            const splitText = doc.splitTextToSize(text, contentWidth - 5);
            doc.text(splitText, margin + 5, cursorY);
            cursorY += (splitText.length * 6) + 2;
            continue;
          }

          const numMatch = line.match(/^\d+\.\s/);
          if (numMatch) {
            doc.setFont(bodyPDF, 'normal');
            doc.setFontSize(11);
            doc.setTextColor(60, 60, 60);
            const splitText = doc.splitTextToSize(line, contentWidth - 5);
            doc.text(splitText, margin + 5, cursorY);
            cursorY += (splitText.length * 6) + 2;
            continue;
          }

          // Special Keywords
          if (line.includes('CHECKLIST')) {
             doc.setFont('helvetica', 'bold');
             doc.setFontSize(9);
             doc.setTextColor(5, 150, 105);
             doc.text('CHECKLIST', margin, cursorY);
             doc.setFont(bodyPDF, 'normal');
             doc.setFontSize(11);
             doc.setTextColor(60, 60, 60);
             line = line.replace('CHECKLIST', '');
          }

          if (line.includes('MISTAKE TO AVOID')) {
             doc.setFont('helvetica', 'bold');
             doc.setFontSize(9);
             doc.setTextColor(220, 38, 38);
             doc.text('CRITICAL ERROR:', margin, cursorY);
             cursorY += 5;
             doc.setFont(bodyPDF, 'normal');
             doc.setFontSize(11);
             doc.setTextColor(60, 60, 60);
             line = line.replace('MISTAKE TO AVOID', '');
          }

          // Blockquotes
          if (line.startsWith('> ')) {
            doc.setDrawColor(5, 150, 105);
            doc.setLineWidth(1);
            const text = line.substring(2);
            const splitText = doc.splitTextToSize(text, contentWidth - 15);
            doc.line(margin, cursorY - 4, margin, cursorY + (splitText.length * 6));
            doc.setFont(bodyPDF, 'italic');
            doc.setFontSize(11);
            doc.setTextColor(80, 80, 80);
            doc.text(splitText, margin + 8, cursorY);
            cursorY += (splitText.length * 6) + 6;
            continue;
          }

          // Standard Paragraph
          doc.setFont(bodyPDF, 'normal');
          doc.setFontSize(11);
          doc.setTextColor(60, 60, 60);
          const splitText = doc.splitTextToSize(line, contentWidth);
          doc.text(splitText, margin, cursorY);
          cursorY += (splitText.length * 7) + 2;
        }

        return { cursorY, currentPage };
      };

      for (let i = 0; i < data.finalPages.length; i++) {
        const page = data.finalPages[i];
        if (i > 0) doc.addPage();
        
        addPageNumber(i + 1);

        if (page.type === 'cover') {
          // Decorative Border
          doc.setDrawColor(240, 240, 240);
          doc.setLineWidth(10);
          doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

          doc.setFont(headingPDF, isHeadingSerif ? 'italic' : 'bold');
          doc.setFontSize(54);
          doc.setTextColor(20, 20, 20);
          const titleLines = doc.splitTextToSize(page.title, contentWidth);
          doc.text(titleLines, pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(12);
          doc.setTextColor(120, 120, 120);
          doc.text((page.subtitle || '').toUpperCase(), pageWidth / 2, pageHeight / 2 + 20, { align: 'center', charSpace: 2 });

          doc.setFont(headingPDF, 'italic');
          doc.setFontSize(14);
          doc.setTextColor(5, 150, 105);
          doc.text('FORGED AT THE STUDIO', pageWidth / 2, pageHeight - 40, { align: 'center' });

        } else if (page.type === 'copyright' || page.type === 'intro' || page.type === 'author' || page.type === 'cta' || page.type === 'resources' || page.type === 'toc') {
          doc.setFont(headingPDF, isHeadingSerif ? 'italic' : 'bold');
          doc.setFontSize(28);
          doc.setTextColor(20, 20, 20);
          doc.text(page.title, margin, topMargin);
          
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.5);
          doc.line(margin, topMargin + 5, pageWidth - margin, topMargin + 5);

          await renderMarkdown(page.content, topMargin + 20, i + 1);
        } else {
          // Chapter Page
          if (page.title.includes('(Cont.)')) {
            doc.setFont(headingPDF, 'italic');
            doc.setFontSize(14);
            doc.setTextColor(150, 150, 150);
            doc.text(page.title, margin, topMargin);
          } else {
            // Chapter Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(5, 150, 105);
            doc.text(`CHAPTER ${(page.chapterIndex + 1).toString().padStart(2, '0')}`, margin, topMargin - 10);
            
            doc.setFont(headingPDF, isHeadingSerif ? 'italic' : 'bold');
            doc.setFontSize(32);
            doc.setTextColor(20, 20, 20);
            const titleSplit = doc.splitTextToSize(page.title, contentWidth);
            doc.text(titleSplit, margin, topMargin + 5);
            
            doc.setDrawColor(5, 150, 105, 0.3);
            doc.setLineWidth(1);
            doc.line(margin, topMargin + (titleSplit.length * 12) + 5, margin + 30, topMargin + (titleSplit.length * 12) + 5);
          }

          // Handle Images
          let startY = topMargin + 30;
          if (page.images && page.images.length > 0 && page.images[0].url && !page.title.includes('(Cont.)')) {
             try {
                // Approximate aspect ratio box
                const img = page.images[0];
                const imgWidth = contentWidth;
                const imgHeight = imgWidth * (9/16);
                doc.addImage(img.url, 'PNG', margin, startY, imgWidth, imgHeight);
                startY += imgHeight + 15;
             } catch (e) {
                console.warn("Failed to add image to PDF", e);
             }
          }

          await renderMarkdown(page.content, startY, i + 1);
        }
      }

      doc.save(`${data.title.replace(/\s+/g, '_')}_Master_Forge_V3.pdf`);
      setExportComplete(true);
    } catch (err) {
      console.error(err);
      alert("Failed to generate vector PDF. Use the Professional ZIP for raw assets.");
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
