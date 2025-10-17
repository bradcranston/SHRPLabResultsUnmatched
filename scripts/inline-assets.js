const fs = require('fs');
const path = require('path');

// Function to inline all CSS and JS files into the HTML
function inlineAssets() {
  const distPath = path.join(__dirname, '../dist');
  const htmlFile = path.join(distPath, 'index.html');
  
  if (!fs.existsSync(htmlFile)) {
    console.error('dist/index.html not found. Run build first.');
    process.exit(1);
  }
  
  let html = fs.readFileSync(htmlFile, 'utf8');
  
  // Get all files in dist directory
  const distFiles = fs.readdirSync(distPath);
  console.log('Files in dist:', distFiles);
  
  // Find CSS files and inline them
  const cssFiles = distFiles.filter(file => file.endsWith('.css') && !file.endsWith('.map'));
  console.log('CSS files found:', cssFiles);
  
  cssFiles.forEach(cssFile => {
    const cssPath = path.join(distPath, cssFile);
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    // More flexible pattern to match the CSS link - handle both relative and absolute paths
    const linkPattern = new RegExp(`<link[^>]*href="[^"]*${cssFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*>`, 'g');
    const linkPatternAbsolute = new RegExp(`<link[^>]*href="/${cssFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`, 'g');
    
    if (html.match(linkPattern) || html.match(linkPatternAbsolute)) {
      html = html.replace(linkPattern, `<style>${cssContent}</style>`);
      html = html.replace(linkPatternAbsolute, `<style>${cssContent}</style>`);
      console.log(`Inlined CSS: ${cssFile}`);
    } else {
      console.log(`No link found for CSS: ${cssFile}`);
    }
  });
  
  // Find JS files and inline them
  const jsFiles = distFiles.filter(file => file.endsWith('.js') && !file.endsWith('.map'));
  console.log('JS files found:', jsFiles);
  
  jsFiles.forEach(jsFile => {
    const jsPath = path.join(distPath, jsFile);
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    
    // More flexible pattern to match the script tag - handle both relative and absolute paths
    const scriptPattern = new RegExp(`<script[^>]*src="[^"]*${jsFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"[^>]*></script>`, 'g');
    const scriptPatternAbsolute = new RegExp(`<script[^>]*src="/${jsFile.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*></script>`, 'g');
    
    if (html.match(scriptPattern) || html.match(scriptPatternAbsolute)) {
      html = html.replace(scriptPattern, `<script>${jsContent}</script>`);
      html = html.replace(scriptPatternAbsolute, `<script>${jsContent}</script>`);
      console.log(`Inlined JS: ${jsFile}`);
    } else {
      console.log(`No script tag found for JS: ${jsFile}`);
    }
  });
  
  // Write the inlined HTML
  fs.writeFileSync(htmlFile, html);
  console.log('Assets inlined successfully into dist/index.html');
  
  // Clean up separate CSS and JS files and map files
  const filesToRemove = [...cssFiles, ...jsFiles, ...distFiles.filter(file => file.endsWith('.map'))];
  filesToRemove.forEach(file => {
    const filePath = path.join(distPath, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Removed ${file}`);
    }
  });
  
  console.log('Final result: Single index.html file with all assets inlined');
}

inlineAssets();
