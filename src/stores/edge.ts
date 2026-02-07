export function getEdgeDownloadUrl(id: string): string {
  const encoded = encodeURIComponent(id);

  return [
    'https://edge.microsoft.com/extensionwebstorebase/v1/crx',
    '?response=redirect',
    '&prodversion=109.0.0.0',
    `&x=id%3D${encoded}%26installsource%3Dondemand%26uc`,
  ].join('');
}
