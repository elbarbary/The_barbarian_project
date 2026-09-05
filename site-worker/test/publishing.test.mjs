import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('optional direct deployments cannot bypass a failed build, validation or push', async()=>{
  for(const file of ['publish-app-data.yml','publish-live-data.yml']) {
    const source=await readFile(new URL(`../../.github/workflows/${file}`,import.meta.url),'utf8');
    const deploy=source.split('- name: Deploy the site')[1].split('\n      - name:')[0];
    assert.match(deploy,/if: success\(\) && steps\.(diff|commit)\.outputs\.changed == 'true'/);
    assert.doesNotMatch(deploy,/continue-on-error: true/);
  }
});
