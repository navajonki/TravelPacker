const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, 'server', 'routes.ts');
const content = fs.readFileSync(routesPath, 'utf8');

// Find patterns where we check only ownership and replace with canUserAccessPackingList
const regex = /\/\/ Verify ownership\s+const user = req\.user as User;\s+if \(packingList\.userId !== user\.id\) {\s+return res\.status\(403\)\.json\({ message: "You don't have permission to access this packing list" }\);\s+}/g;

const replacement = `// Check if the user has access to this packing list
    const user = req.user as User;
    const hasAccess = await storage.canUserAccessPackingList(user.id, packingList.id);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have permission to access this packing list" });
    }`;

const updatedContent = content.replace(regex, replacement);

fs.writeFileSync(routesPath, updatedContent, 'utf8');
console.log('Updated access checks in routes.ts');
