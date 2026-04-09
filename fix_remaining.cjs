const fs = require('fs');

function fixFiles() {
  const files = [
    {
      path: 'src/client/components/investigation/CommunicationAnalysis.tsx',
      replacements: [
        {
          from: /className="mr-sm"/g,
          to: 'style={{ marginRight: "var(--space-sm)" }}',
        },
        {
          from: /className="mt-2 space-y-1"/g,
          to: 'style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}',
        },
      ],
    },
    {
      path: 'src/client/components/investigation/ForensicAnalysisWorkspace.tsx',
      replacements: [
        {
          from: /className="px-0"/g,
          to: 'style={{ paddingLeft: 0, paddingRight: 0 }}',
        },
        {
          from: /className="mr-1"/g,
          to: 'style={{ marginRight: "0.25rem" }}',
        },
        {
          from: /className="animate-spin mr-1"/g,
          to: 'style={{ marginRight: "0.25rem" }} className={styles.spin}',
        },
      ],
    },
    {
      path: 'src/client/components/investigation/InvestigationTimelineBuilder.tsx',
      replacements: [
        {
          from: /className=\{cn\('transition-all border-l-4',\s*`border-l-\[var\(--lq-\$\{variant\}\)\]`\)\}/g,
          to: 'style={{ borderLeft: `4px solid var(--lq-${variant})`, transition: "all 0.2s ease" }}',
        },
        {
          from: /className="cursor-grab active:cursor-grabbing opacity-30 mt-1"/g,
          to: 'style={{ cursor: "grab", opacity: 0.3, marginTop: "0.25rem" }}',
        },
      ],
    },
  ];

  files.forEach((f) => {
    let content = fs.readFileSync(f.path, 'utf8');
    let hasChanges = false;
    f.replacements.forEach((r) => {
      const replaced = content.replace(r.from, r.to);
      if (replaced !== content) {
        content = replaced;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      fs.writeFileSync(f.path, content);
      console.log('Fixed', f.path);
    }
  });
}

fixFiles();
