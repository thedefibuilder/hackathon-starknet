type TContentType = 'text/plain';

export default function downloadContent(
  content: Blob | string,
  fileName: string,
  contentType?: TContentType
) {
  const contentBlob =
    content instanceof Blob ? content : new Blob([content], { type: contentType });
  const url = URL.createObjectURL(contentBlob);

  const temporaryAnchor = document.createElement('a');
  temporaryAnchor.href = url;
  temporaryAnchor.download = fileName;

  document.body.append(temporaryAnchor);
  temporaryAnchor.click();

  temporaryAnchor.remove();
  URL.revokeObjectURL(url);
}
