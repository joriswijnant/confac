import React from 'react';
import {Table} from 'react-bootstrap';
import {useSelector} from 'react-redux';
import InvoiceModel, {groupInvoicesPerMonth} from '../models/InvoiceModel';
import {InvoiceWorkedDays} from '../invoice-list/InvoiceWorkedDays';
import {InvoicesTotal} from '../invoice-edit/InvoiceTotal';
import {InvoiceAmountLabel} from '../controls/InvoicesSummary';
import {createInvoiceList} from '../models/getInvoiceFeature';
import {ConfigModel} from '../../config/models/ConfigModel';
import InvoiceListModel from '../models/InvoiceListModel';
import {ConfacState} from '../../../reducers/app-state';
import {ListHeader} from '../../controls/table/ListHeader';
import {IList} from '../../controls/table/table-models';
import {getInvoiceListRowClass} from './getInvoiceListRowClass';
import {ListFooter} from '../../controls/table/ListFooter';



type GroupedInvoiceTableProps = {
  vm: InvoiceListModel;
  config: ConfigModel;
}

export const GroupedInvoiceTable = ({vm, config}: GroupedInvoiceTableProps) => {
  const invoicePayDays = useSelector((state: ConfacState) => state.config.invoicePayDays);

  const invoices = vm.getFilteredInvoices();
  const featureConfig = createInvoiceList({
    showOrderNr: config.showOrderNr,
    isQuotation: vm.isQuotation,
    invoicePayDays,
    data: invoices,
    isGroupedOnMonth: true,
  });


  const invoicesPerMonth = groupInvoicesPerMonth(invoices).sort((a, b) => b.key.localeCompare(a.key));

  const hideBorderStyle = {borderBottom: 0, borderTop: 0};

  return (
    <Table size="sm" style={{marginTop: 10}}>
      <ListHeader feature={featureConfig} />

      {invoicesPerMonth.map(({key, invoiceList}) => [
        <tbody key={key}>
          {invoiceList.map((invoice, index) => (
            <GroupedInvoiceListRow
              key={invoice._id}
              config={featureConfig.list}
              invoice={invoice}
              isFirstRow={index === 0}
            />
          ))}
        </tbody>,

        (!vm.isQuotation && invoiceList.length > 1) && (
          <tbody key={`${key}-group-row`} style={hideBorderStyle}>
            <tr style={{...hideBorderStyle, height: 60}}>
              <td style={hideBorderStyle}>&nbsp;</td>
              <td colSpan={featureConfig.list.rows.cells.length - 1}>
                <strong><InvoiceAmountLabel invoices={invoiceList} isQuotation={vm.isQuotation} /></strong>
              </td>
              <td><strong><InvoiceWorkedDays invoices={invoiceList} /></strong></td>
              <td><InvoicesTotal invoices={invoiceList} totalOnly /></td>
              <td>&nbsp;</td>
            </tr>
          </tbody>
        ),
      ])}

      <ListFooter config={featureConfig.list} />
    </Table>
  );
};

type GroupedInvoiceListRowProps = {
  invoice: InvoiceModel;
  isFirstRow: boolean;
  config: IList<InvoiceModel>;
}


const GroupedInvoiceListRow = ({invoice, isFirstRow, config}: GroupedInvoiceListRowProps) => {
  const invoicePayDays = useSelector((state: ConfacState) => state.config.invoicePayDays);
  const rowTableClassName = getInvoiceListRowClass(invoice, invoicePayDays);

  const borderStyle = {borderBottom: 0, borderTop: 0};
  return (
    <tr className={rowTableClassName} style={borderStyle}>
      {config.rows.cells.map((col, i) => {
        const isGroupedByColumn = col.key === 'date-month';
        const hideValue = !isFirstRow && isGroupedByColumn;

        const className = typeof col.className === 'function' ? col.className(invoice) : col.className;
        return (
          <td key={i} style={isGroupedByColumn ? borderStyle : undefined} className={className}>
            {hideValue ? null : col.value(invoice)}
          </td>
        );
      })}
    </tr>
  );
};
