import request from 'superagent-bluebird-promise';
import {browserHistory} from 'react-router';
import {store} from '../store.js';

import {ACTION_TYPES} from './ActionTypes.js';
import {success, failure, busyToggle} from './appActions.js';
import {buildUrl, catchHandler} from './fetch.js';
import t from '../trans.js';


export function createInvoice(data) {
  return dispatch => {
    dispatch(busyToggle());
    request.post(buildUrl('/invoices'))
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send(data)
      .then(function(res) {
        dispatch({
          type: ACTION_TYPES.INVOICE_ADDED,
          invoice: res.body
        });

        dispatch(success(t('invoice.createConfirm')));
        browserHistory.push('/invoice/' + res.body.number);
        //browserHistory.push('/');
      }, function(err) {
        if (err.res.text === 'TemplateNotFound') {
          dispatch(failure(t('invoice.pdfTemplateNotFoundTitle'), t('invoice.pdfTemplateNotFound')));
        } else {
          catchHandler(err);
        }
      })
      .catch(catchHandler)
      .then(() => dispatch(busyToggle.off()));
  };
}

function updateInvoiceRequest(data, successMsg, andGoHome) {
  return dispatch => {
    dispatch(busyToggle());
    request.put(buildUrl('/invoices'))
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .send(data)
      .then(function(res) {
        dispatch({
          type: ACTION_TYPES.INVOICE_UPDATED,
          invoice: res.body
        });

        dispatch(success(successMsg || t('toastrConfirm')));
        if (andGoHome) { // TODO: check: do we always stay on the same page after insert? Then delete this!
          browserHistory.push('/');
        }
      })
      .catch(catchHandler)
      .then(() => dispatch(busyToggle.off()));
  };
}

export function invoiceAction(invoice, type) {
  if (type === 'create') {
    return createInvoice(invoice);
  } else if (type === 'preview') {
    return previewInvoice(invoice);
  } else if (type === 'update') {
    return updateInvoice(invoice);
  } else if (type === 'update-pdf') {
    return updateInvoicePdf(invoice);
  }
  console.log('unknown incoiceAction', type, invoice); // eslint-disable-line
}

export function updateInvoice(data) {
  return updateInvoiceRequest(data, undefined, true);
}
export function toggleInvoiceVerify(data) {
  const successMsg = data.verified ? t('invoice.isNotVerifiedConfirm') : t('invoice.isVerifiedConfirm');
  const newData = {...data, verified: !data.verified};
  return updateInvoiceRequest(newData, successMsg, false);
}

export function updateInvoicePdf(invoice) {
  return dispatch => {
    dispatch(busyToggle());
    request.put(buildAttachmentUrl(invoice, 'pdf'))
      .set('Content-Type', 'application/json')
      .then(function(res) {
        dispatch(success());
        return true;
      })
      .catch(catchHandler)
      .then(() => dispatch(busyToggle.off()));
  };
}

export function deleteInvoiceAttachment(invoice, {type}) {
  return dispatch => {
    dispatch(busyToggle());
    request.delete(buildAttachmentUrl(invoice, type))
      .then(function(res) {
        dispatch({
          type: ACTION_TYPES.INVOICE_UPDATED,
          invoice: res.body
        });

        dispatch(success());
        return true;
      })
    .catch(catchHandler)
    .then(() => dispatch(busyToggle.off()));
  };
}

export function updateInvoiceAttachment(invoice, {type, file}) {
  return dispatch => {
    dispatch(busyToggle());
    var req = request.put(buildAttachmentUrl(invoice, type));
      //.set('Content-Type', 'application/json');

    req.attach(file.name, file);

    // file.forEach(f => {
    //   req.attach(f.name, f);
    // });

    req.then(function(res) {
      dispatch({
        type: ACTION_TYPES.INVOICE_UPDATED,
        invoice: res.body
      });

      dispatch(success());
      return true;
    })
    .catch(catchHandler)
    .then(() => dispatch(busyToggle.off()));
  };
}

export function deleteInvoice(invoice) {
  return dispatch => {
    dispatch(busyToggle());
    request.delete(buildUrl('/invoices'))
      .set('Content-Type', 'application/json')
      .send({id: invoice._id})
      .then(function(res) {
        console.log('invoice deleted', invoice); // eslint-disable-line
        dispatch({
          type: ACTION_TYPES.INVOICE_DELETED,
          id: invoice._id
        });
        dispatch(success(t('invoice.deleteConfirm')));
        return true;
      })
      .catch(catchHandler)
      .then(() => dispatch(busyToggle.off()));
  };
}

export function previewInvoice(data) {
  return dispatch => {
    dispatch(busyToggle());
    request.post(buildUrl('/invoices/preview'))
      .set('Content-Type', 'application/json')
      .send(data)
      .then(function(res) {
        const pdfAsDataUri = 'data:application/pdf;base64,' + res.text;
        openWindow(pdfAsDataUri, getInvoiceFileName(data));
      })
      .catch(catchHandler)
      .then(() => dispatch(busyToggle.off()));
  };
}

function downloadBase64File(fileName, content) {
  var link = document.createElement('a');
  link.download = fileName;
  link.target = '_blank';
  link.href = 'data:application/octet-stream;base64,' + content;
  link.click();
}

function downloadFile(attachment, content) {
  var link = document.createElement('a');
  link.download = attachment.fileName;
  const blob = b64ToBlob(content, attachment.fileType);
  const blobUrl = URL.createObjectURL(blob);
  link.href = blobUrl;
  link.click();
}

function b64ToBlob(b64Data, contentType = '', sliceSize = 512) {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });
  return blob;
}

export function downloadInvoice(invoice, attachment) {
  // ATTN: Non-dispatchable
  // We're not storing entire files in the state!
  // + Would break the AttachmentDownloadIcon
  return request.get(buildAttachmentUrl(invoice, attachment.type))
    .set('Content-Type', 'application/json')
    .then(function(res) {
      var fileName;
      if (attachment.type === 'pdf') {
        fileName = getInvoiceFileName(invoice);
        downloadBase64File(fileName, res.body);
      } else {
        //console.log('grr', attachment, res.body);
        downloadFile(attachment, res.body);
      }

      return true;
    })
    .catch(catchHandler);
}

function buildAttachmentUrl(invoice, type) {
  return buildUrl(`/attachments/${invoice._id}/${type}`);
}

function getInvoiceFileName(data) {
  var fileName = data.client.invoiceFileName;

  const nrRegex = /\{nr:(\d+)\}/;
  const nrMatch = fileName.match(nrRegex);
  if (nrMatch) {
    const nrSize = parseInt(nrMatch[1], 10);
    fileName = fileName.replace(nrRegex, ('000000' + data.number).slice(-nrSize));
  }

  const dateRegex = /\{date:([^}]+)\}/;
  const dateMatch = fileName.match(dateRegex);
  if (dateMatch) {
    const dateFormat = dateMatch[1];
    fileName = fileName.replace(dateRegex, data.date.format(dateFormat));
  }

  if (fileName.indexOf('{orderNr}') !== -1) {
    fileName = fileName.replace('{orderNr}', data.orderNr);
  }

  return fileName + '.pdf';
}

function openWindow(pdf, fileName) {
  // TODO: this solution doesn't work on Internet Exploder
  // GET request /attachment that just returns the bytestream
  // and then here:
  //window.open('data:application/pdf,' + escape(pdf));
  // (that could work right?)

  // Does work on Chrome, Firefox and Chrome
  var win = window.open('', '', '');
  if (win && win.document) {
    const html = `
      <html>
        <head>
          <title>${fileName}</title>
          <style>
            * { margin:0; padding:0 }
            body { margin:0; padding:0; text-align:center }
            #hold_my_iframe { padding:0px; margin:0 auto; width:100%; height:100% }
          </style>
        </head>
        <body>
          <table border=0 cellspacing=0 cellpadding=0 id="hold_my_iframe">
            <iframe src="${pdf}" width=100% height=100% marginwidth=0 marginheight=0 frameborder=0></iframe>
          </table>
        </body>
      </html>`;

    win.document.write(html);
    win.document.title = fileName;

  } else {
    store.dispatch(failure(t('controls.popupBlockerTitle'), t('controls.popupBlocker'), 8000));
  }
}
