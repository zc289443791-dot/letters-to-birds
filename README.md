# 把心事交给鸟 · 网页版 1.0.1

作品地址：[birds.zhaichuang.me](https://birds.zhaichuang.me/)

输入一句文字，让鸟群将它带走。当前版本采用蓝色背景、随风摆动的绿叶和飘落叶片，并包含自带字体、移动端键盘适配及页面隐藏时暂停动画的处理。

## 文件

- `index.html`：入口网页，来自用户提供的网页版 1.0.1，内容保持原样，仅重命名为默认首页。
- `bird-assets/app-1.0.1.js`：动画与交互脚本。
- `bird-assets/BirdSong-Light.woff2`：网页字体。
- `bird-assets/font-license.json`：字体来源、版权声明及 SIL Open Font License 1.1 全文，随字体一起保留。
- `update-birds.sh`：现有阿里云站点的更新脚本。
- `SHA256SUMS.txt`：上述网页及资源的 SHA-256 校验值。

纯静态网站，无需构建、数据库或 Node.js。网页与整个 `bird-assets` 文件夹必须保持在同一层级。

## 更新阿里云现有站点

适用于已经运行 Nginx 和 HTTPS 的 `birds.zhaichuang.me`，网站目录为 `/var/www/birds.zhaichuang.me`。脚本不创建新站点、不修改 Nginx 配置、不申请证书，也不需要重新设置 DNS。

将 `birds-v1.0.1-aliyun-20261020.zip` 上传到服务器 `/home/admin/`，然后一次复制执行：

```bash
(
set -e
release_dir="$(mktemp -d /home/admin/birds-v1.0.1.XXXXXXXX)"
unzip -q /home/admin/birds-v1.0.1-aliyun-20261020.zip -d "$release_dir"
sudo bash "$release_dir/update-birds.sh"
)
```

脚本核对源文件和现有站点，备份旧版本，再先更新资源、最后替换首页。发布后会通过本机 HTTPS 核对首页、脚本、字体和字体许可文件；失败时尝试恢复旧版本。备份路径会显示在终端，位于 `/var/backups/birds-v1.0.1.*` 下。

看到 `Published` 后，打开：

**https://birds.zhaichuang.me/?v=1.0.1**

本仓库的 GitHub 更新不会自动更改阿里云服务器；需要在服务器执行上述更新命令。GitHub 的 Code → Download ZIP 下载也包含相同更新脚本，解压后在仓库目录运行 `sudo bash update-birds.sh` 即可。

## 本地预览与检查

将仓库目录作为静态网站根目录提供 HTTP 服务，再访问 `index.html`。字体加载依赖同目录下的 `bird-assets`，不建议通过聊天工具单独发送 HTML 后直接打开。

检查输入与放飞、中文字体、手机键盘弹出时的输入框位置，以及切回页面后的动画恢复。部署包的完整性可以在解压目录执行 `sha256sum -c SHA256SUMS.txt` 核对。
