import React, {useState} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import moment from 'moment';
import {Modal, BaseModalProps} from '../Modal';
import {t} from '../../utils';
import {EmailForm} from './EmailForm';
import {EmailModel} from './EmailModels';
import {getNewEmail} from './getNewEmail';
import InvoiceModel from '../../invoice/models/InvoiceModel';
import {invoiceReplacements, getInvoiceReplacements} from '../../invoice/invoice-replacements';
import {ConfacState} from '../../../reducers/app-state';
import {sendEmail} from '../../../actions/emailActions';
import {ConfigModel} from '../../config/models/ConfigModel';
import {projectMonthResolve} from '../../project/ProjectMonthsLists';
import {FullProjectMonthModel} from '../../project/models/FullProjectMonthModel';


export enum EmailTemplate {
  None,
  InitialEmail,
  Reminder,
}


const getDefaultEmailValue = (
  invoice: InvoiceModel,
  template: EmailTemplate,
  config: ConfigModel,
  fullProjectMonth?: FullProjectMonthModel,
): EmailModel => {

  const defaultEmail = config.email;
  if (!invoice.client || !invoice.client.email) {
    return defaultEmail;
  }

  const emailValues = Object.keys(invoice.client.email).reduce((acc: EmailModel, cur: string) => {
    if (invoice.client.email[cur]) {
      acc[cur] = invoice.client.email[cur];
      return acc;
    }
    return acc;
  }, {} as EmailModel);

  const finalValues = {...defaultEmail, ...emailValues};
  finalValues.subject = invoiceReplacements(finalValues.subject, invoice, fullProjectMonth);
  if (template === EmailTemplate.Reminder) {
    if (config.emailReminder) {
      finalValues.body = config.emailReminder;
    }
    if (config.emailReminderCc && !invoice.client.email.cc) {
      finalValues.cc = config.emailReminderCc;
    }
    if (config.emailReminderBcc && !invoice.client.email.bcc) {
      finalValues.bcc = config.emailReminderBcc;
    }
  }
  finalValues.body = invoiceReplacements(finalValues.body, invoice, fullProjectMonth);
  finalValues.body += config.emailSignature;

  return getNewEmail(finalValues);
};




type EmailModalProps = Omit<BaseModalProps, 'show'> & {
  invoice: InvoiceModel;
  template: EmailTemplate;
}


export const EmailModal = ({invoice, onClose, template, ...props}: EmailModalProps) => {
  const dispatch = useDispatch();
  const config = useSelector((state: ConfacState) => state.config);
  const fullProjectMonths = useSelector((state: ConfacState) => state.projectsMonth.map(pm => projectMonthResolve(pm, state)));
  const fullProjectMonth = fullProjectMonths.find(x => x.invoice && x.invoice._id === invoice._id);
  const [value, setValue] = useState(getDefaultEmailValue(invoice, template, config, fullProjectMonth));

  const attachmentsAvailable = invoice.attachments.map(a => a.type);
  return (
    <Modal
      show
      onClose={onClose}
      onConfirm={() => dispatch(sendEmail(invoice, value, fullProjectMonth))}
      confirmText={t('email.send')}
      confirmVariant="danger"
      title={<EmailModalTitle title={t('email.title')} lastEmail={invoice.lastEmail} template={template} />}
      {...props}
    >
      <EmailForm
        value={value}
        onChange={setValue}
        attachmentsAvailable={attachmentsAvailable}
        textEditorReplacements={getInvoiceReplacements(invoice, fullProjectMonth)}
      />
    </Modal>
  );
};





type EmailModalTitleProps = {
  title: string,
  lastEmail: string,
  template: EmailTemplate;
}

export const EmailModalTitle = ({title, lastEmail}: EmailModalTitleProps) => {
  return (
    <span>
      {title}
      <small className="modal-subtitle">
        {lastEmail && t('email.lastEmail', {at: moment(lastEmail).format('D/M/YYYY'), daysAgo: moment(lastEmail).fromNow()})}
        {!lastEmail && t('email.notMailed')}
      </small>
    </span>
  );
};
