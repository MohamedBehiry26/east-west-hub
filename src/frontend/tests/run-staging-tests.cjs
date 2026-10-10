const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const output=path.resolve(root,'../../work/staging-functions-tests');
const compile=spawnSync(process.execPath,[path.join(root,'node_modules/typescript/bin/tsc'),'--target','es2022','--module','commonjs','--lib','es2022,dom','--skipLibCheck','--outDir',output,'functions/api/[[path]].ts','functions/_middleware.ts','functions/robots.txt.ts','functions/sitemap.xml.ts'],{cwd:root,stdio:'inherit'});
if(compile.status!==0)process.exit(compile.status??1);
const tests=spawnSync(process.execPath,['--test',path.join(__dirname,'staging-functions.test.cjs')],{cwd:root,stdio:'inherit',env:{...process.env,STAGING_FUNCTIONS_BUILD:output}});
process.exit(tests.status??1);
