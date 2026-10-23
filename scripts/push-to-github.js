const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');

async function pushToGitHub(repoUrl, token) {
  if (!repoUrl) {
    throw new Error('Vui lòng cung cấp URL kho lưu trữ GitHub (ví dụ: https://github.com/username/taphoa-maicua.git)');
  }
  if (!token) {
    throw new Error('Vui lòng cung cấp GitHub Personal Access Token để xác thực');
  }

  console.log(`>> Đang chuẩn bị đồng bộ lên GitHub: ${repoUrl}...`);

  // Ensure remote 'origin' exists or update it
  try {
    await git.deleteRemote({ fs, dir, remote: 'origin' });
  } catch (e) {}

  await git.addRemote({
    fs,
    dir,
    remote: 'origin',
    url: repoUrl
  });

  console.log('>> Đang đẩy mã nguồn (Git Push) lên nhánh main...');

  const pushResult = await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: 'main',
    force: true,
    onAuth: () => ({
      username: token,
      password: ''
    })
  });

  console.log('✓ ĐÃ ĐẨY TOÀN BỘ MÃ NGUỒN LÊN GITHUB THÀNH CÔNG!');
  return pushResult;
}

// Support command-line: node scripts/push-to-github.js <repoUrl> <token>
if (require.main === module) {
  const [,, repoUrl, token] = process.argv;
  if (!repoUrl || !token) {
    console.log('Cách dùng: node scripts/push-to-github.js <repoUrl> <token>');
    process.exit(1);
  }
  pushToGitHub(repoUrl, token)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Lỗi khi đẩy lên GitHub:', err.message);
      process.exit(1);
    });
}

module.exports = { pushToGitHub };
