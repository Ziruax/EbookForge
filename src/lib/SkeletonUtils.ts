import React from 'react';
import { BookData, ChapterOutline, PageContent } from '../types';

export function createBookSkeleton(data: BookData): PageContent[] {
  const pages: PageContent[] = [];

  // 1. Cover
  pages.push({
    id: 'page_cover',
    type: 'cover',
    title: data.title,
    subtitle: `The Essential Guide for ${data.audience}`,
    content: '',
    wordCount: 0,
    images: [{ id: 'img_cover', aspect: '9:16', prompt: `Professional book cover for ${data.title}, minimalist luxury style` }]
  });

  // 2. Copyright
  pages.push({
    id: 'page_copyright',
    type: 'copyright',
    title: 'Copyright',
    content: `Copyright © ${new Date().getFullYear()} EbookForge studio. All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews and certain other noncommercial uses permitted by copyright law.`,
    wordCount: 50,
    images: []
  });

  // 3. TOC
  pages.push({
    id: 'page_toc',
    type: 'toc',
    title: 'Table of Contents',
    content: 'TOC_PLACEHOLDER',
    wordCount: 0,
    images: []
  });

  // 4. Intro
  pages.push({
    id: 'page_intro',
    type: 'intro',
    title: 'Introduction',
    content: 'Every great journey starts with a single step. In this book, we explore how to transform your life and business.',
    wordCount: 200,
    images: [{ id: 'img_intro', aspect: '16:9', prompt: `Inspirational start, first step, path to success` }]
  });

  // Chapters (to be filled in Step 3)
  if (data.outline) {
    data.outline.outline.forEach((chapter, idx) => {
      pages.push({
        id: `page_chapter_${idx}`,
        type: 'chapter',
        chapterIndex: idx,
        title: chapter.title,
        content: `CHAPTER_${idx}_CONTENT_PLACEHOLDER`,
        wordCount: 0,
        images: [{ id: `img_chapter_${idx}`, aspect: idx % 3 === 0 ? '16:9' : idx % 3 === 1 ? '1:1' : '9:16', prompt: chapter.outcome }]
      });
    });
  }

  // Final Steps
  pages.push({
    id: 'page_conclusion',
    type: 'conclusion',
    title: 'Conclusion',
    content: 'Thank you for following this guide. Your transformation starts now.',
    wordCount: 150,
    images: []
  });

  pages.push({
    id: 'page_author',
    type: 'author',
    title: 'About the Author',
    content: 'An expert in the field dedicated to helping others achieve their full potential.',
    wordCount: 100,
    images: [{ id: 'img_author', aspect: '1:1', prompt: 'Professional headshot of an author' }]
  });

  pages.push({
    id: 'page_resources',
    type: 'resources',
    title: 'Resources',
    content: 'RESOURCES_PLACEHOLDER',
    wordCount: 0,
    images: []
  });

  pages.push({
    id: 'page_cta',
    type: 'cta',
    title: 'Next Steps',
    content: 'Ready to take things to the next level? Visit our website to learn more.',
    wordCount: 50,
    images: []
  });

  return pages;
}
