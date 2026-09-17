const { execSync } = require('child_process');

try {
  console.log('Running data update...');
  execSync('npm run update-data', { stdio: 'inherit' });

  console.log('Staging changes...');
  execSync('git add src/data/f1Data.ts src/data/eliteCohort.json', { stdio: 'inherit' });

  // Check if there's anything to commit
  const status = execSync('git status --porcelain src/data/f1Data.ts src/data/eliteCohort.json').toString().trim();
  
  if (status) {
    console.log('Changes detected. Committing and pushing to GitHub...');
    execSync('git commit -m "Auto-sync F1 Fantasy HAR data"', { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log('Successfully pushed to GitHub! Vercel will automatically deploy.');
  } else {
    console.log('No changes detected in f1Data.ts. Skipped push.');
  }
} catch (error) {
  console.error('Error during auto-sync:', error.message);
  process.exit(1);
}
