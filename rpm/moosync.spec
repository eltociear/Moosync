%define _build_id_links none

%global __provides_exclude ^((libffmpeg[.]so.*)|(lib.*\\.so.*))$
%global __requires_exclude ^((libffmpeg[.]so.*)|(lib.*\\.so.*))$

Summary: Moosync is a customizable desktop music player with a clean interface
Name: moosync
Version: 3.0.1
Release: 1
URL: https://github.com/Moosync/Moosync
License: GPLv3+
Group: Applications/Multimedia
Source0: %{url}/releases/download/v%{version}/Moosync-%{version}-linux-x86_64.rpm
ExclusiveArch: x86_64

Requires: vips

BuildRequires: desktop-file-utils
 
Distribution: Fedora Linux
Vendor: Sahil Gupte
Packager: Sahil Gupte <sahilsachingupte@gmail.com>

%description
Features
  * Play audio files on your desktop.
  * Seamlessly integrate your Spotify and Youtube (including Invidious) songs.
  * Ad-free
  * Realtime lyrics
  * Scrobble your tracks on LastFM.
  * Get music recommendations directly from Spotify, Youtube and LastFM
  * Mix and match songs from different providers in a single playlist
  * Easy to use interface
  * Customizable theme engine
  * Develop own apps on top of Moosync Extension API
  * Available on Windows and Linux and MacOS

%prep
rpm2cpio %{SOURCE0} | cpio -idmv
sed -i 's|/opt/Moosync/moosync|%{_libdir}/%{name}/moosync|' \
    %{_builddir}/usr/share/applications/moosync.desktop

%install
%dnl cp -a opt/ %{buildroot}/opt/
mkdir -p %{buildroot}%{_libdir}/%{name}/
cp -a opt/Moosync/* %{buildroot}%{_libdir}/%{name}/

mkdir -p %{buildroot}%{_datadir}/
cp -a usr/share/* %{buildroot}%{_datadir}/

mkdir -p %{buildroot}%{_bindir}/
ln -sf %{_libdir}/%{name}/moosync %{buildroot}%{_bindir}/moosync

strip -s %{buildroot}%{_libdir}/%{name}/*.so
strip -s %{buildroot}%{_libdir}/%{name}/{moosync,chrome-sandbox}

%check
desktop-file-validate %{buildroot}%{_datadir}/applications/*.desktop

%files
%{_bindir}/moosync
%{_datadir}/applications/*.desktop
%{_libdir}/%{name}/
%{_datadir}/icons/hicolor/*/apps/*.png
%attr(4755,root,root) %{_libdir}/%{name}/chrome-sandbox