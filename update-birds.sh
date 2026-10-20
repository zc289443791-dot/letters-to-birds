#!/usr/bin/env bash
# Update the existing birds.zhaichuang.me website without changing Nginx or TLS.
set -Eeuo pipefail

domain='birds.zhaichuang.me'
site="/var/www/$domain"
bundle="$(cd -- "$(dirname -- "$0")" && pwd)"
files=(bird-assets/app-1.0.1.js bird-assets/BirdSong-Light.woff2 bird-assets/font-license.json index.html)
fail() { echo "ERROR: $*" >&2; exit 1; }

test "$(id -u)" -eq 0 || fail 'Run with sudo bash.'
for cmd in curl sha256sum realpath mktemp install cp mv chmod rm; do
    command -v "$cmd" >/dev/null || fail "Missing command: $cmd"
done
test -d "$site" && test ! -L "$site" || fail "Existing website directory not found: $site"
test "$(realpath "$site")" = "$site" || fail 'Unexpected website directory.'
test -f "$site/index.html" && test ! -L "$site/index.html" || fail 'Existing homepage is missing or a symbolic link.'
grep -Fq '<title>把心事交给鸟</title>' "$site/index.html" || fail 'The target homepage belongs to another website.'
test ! -L "$site/bird-assets" || fail 'The asset directory is a symbolic link.'
if test -e "$site/bird-assets"; then test -d "$site/bird-assets" || fail 'The asset path is not a directory.'; fi
for relative in "${files[@]}"; do
    test -f "$bundle/$relative" && test ! -L "$bundle/$relative" || fail "Missing source file: $relative"
    test ! -L "$site/$relative" || fail "Symbolic link at target: $relative"
    if test -e "$site/$relative"; then test -f "$site/$relative" || fail "Target is not a file: $relative"; fi
done
(
    cd "$bundle"
    sha256sum -c SHA256SUMS.txt
)

work="$(mktemp -d /tmp/birds-v1.0.1.XXXXXXXX)"
verify_file() {
    local relative="$1" expected="$2" attempt actual
    for attempt in {1..10}; do
        if curl --noproxy '*' --fail --silent --show-error --location \
            --connect-timeout 3 --max-time 15 --header 'Connection: close' \
            --resolve "$domain:80:127.0.0.1" --resolve "$domain:443:127.0.0.1" \
            "https://$domain/$relative?v=1.0.1-20261020" -o "$work/served"; then
            actual="$(sha256sum "$work/served")"
            if test "${actual%% *}" = "$expected"; then return 0; fi
        fi
        sleep 1
    done
    echo "HTTPS verification failed: $relative" >&2
    return 1
}

# Confirm that the local HTTPS virtual host serves this exact site directory.
previous="$(sha256sum "$site/index.html")"
verify_file index.html "${previous%% *}"
backup="$(mktemp -d /var/backups/birds-v1.0.1.XXXXXXXX)"
mkdir -p "$backup/original/bird-assets"
for relative in "${files[@]}"; do
    if test -f "$site/$relative"; then cp -p "$site/$relative" "$backup/original/$relative"; fi
done
had_assets=0
if test -d "$site/bird-assets"; then had_assets=1; fi
printf '%s\n' "$site" > "$backup/site-path.txt"
staged=''

rollback() {
    code=$?
    trap - ERR
    set +e
    restored=1
    if test -n "$staged"; then rm -f "$staged" || restored=0; fi
    for relative in "${files[@]}"; do
        if test -f "$backup/original/$relative"; then
            if staged="$(mktemp "$(dirname "$site/$relative")/.birds-rollback.XXXXXXXX")"; then
                cp -p "$backup/original/$relative" "$staged" && mv -f "$staged" "$site/$relative" || restored=0
            else
                restored=0
            fi
        else
            rm -f "$site/$relative" || restored=0
        fi
    done
    if test "$had_assets" -eq 0; then rmdir "$site/bird-assets" || restored=0; fi
    if test "$restored" -eq 1; then
        echo 'Update failed. The previous website files were restored.' >&2
    else
        echo 'Update failed. Automatic restoration needs attention.' >&2
    fi
    echo "Backup: $backup/original" >&2
    exit "$code"
}
trap rollback ERR

if test "$had_assets" -eq 0; then install -d -m 755 "$site/bird-assets"; fi
for relative in "${files[@]}"; do
    staged="$(mktemp "$(dirname "$site/$relative")/.birds-publish.XXXXXXXX")"
    install -m 644 "$bundle/$relative" "$staged"
    mv -f "$staged" "$site/$relative"
    staged=''
done
for relative in "${files[@]}"; do
    expected="$(sha256sum "$bundle/$relative")"
    verify_file "$relative" "${expected%% *}"
done
trap - ERR
echo "Published: https://$domain/?v=1.0.1"
echo "Previous version backup: $backup/original"
