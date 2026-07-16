import fetch from 'node-fetch';

async function main() {
  try {
    const res = await fetch('http://localhost:3002/api/v1/projects/ivy-county-sector-75-noida');
    const json: any = await res.json();
    console.log('builder:', json.project?.builder);
    console.log('builder_detail:', json.project?.builder_detail);
  } catch (e) {
    console.error(e);
  }
}
main();
