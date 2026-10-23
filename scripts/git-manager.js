const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');

async function commitAll(message = 'Khởi tạo Tạp Hóa Mai Cua - Quản lý bán hàng') {
  console.log('>> Đang lập chỉ mục các tệp tin trong dự án...');
  const files = await git.listFiles({ fs, dir });
  
  // Status matrix to add all new and modified files
  const status = await git.statusMatrix({ fs, dir });
  for (const [filepath, head, workdir, stage] of status) {
    if (workdir !== 0) {
      await git.add({ fs, dir, filepath });
    } else if (head === 1 && workdir === 0) {
      await git.remove({ fs, dir, filepath });
    }
  }

  const sha = await git.commit({
    fs,
    dir,
    author: {
      name: 'Tap Hoa Mai Cua',
      email: 'admin@taphoamaicua.com'
    },
    message
  });

  console.log('✓ Đã tạo Git commit thành công:', sha);

  // Set branch to main
  try {
    await git.branch({ fs, dir, ref: 'main' });
  } catch (e) {}

  return sha;
}

if (require.main === module) {
  commitAll().catch(console.error);
}

module.exports = { commitAll, dir };
