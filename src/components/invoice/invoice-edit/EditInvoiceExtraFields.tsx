import React, {Component} from 'react';
import {Row, Col} from 'react-bootstrap';
import {t} from '../../utils';
import InvoiceModel from '../models/InvoiceModel';
import {HeaderWithEditIcon} from '../../controls/Headers';
import {PropertiesSelect} from '../../controls/form-controls/select/PropertiesSelect';
import {ExtraFieldsInput} from '../../controls/form-controls/inputs/ExtraFieldsInput';


type EditInvoiceExtraFieldsProps = {
  invoice: InvoiceModel,
  onChange: any,
  forceOpen: boolean,
}

type EditInvoiceExtraFieldsState = {
  extraFieldFormOpen: boolean,
}

export class EditInvoiceExtraFields extends Component<EditInvoiceExtraFieldsProps, EditInvoiceExtraFieldsState> {
  constructor(props: any) {
    super(props);
    this.state = {extraFieldFormOpen: props.forceOpen};
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    if (this.props.forceOpen !== nextProps.forceOpen) {
      this.setState({extraFieldFormOpen: nextProps.forceOpen});
    }
  }

  render() {
    const {invoice, onChange} = this.props;

    if (!this.props.forceOpen && invoice.extraFields.length === 0) {
      return null;
    }

    return (
      <div>
        <Row>
          <HeaderWithEditIcon
            size={4}
            label={t('extraFields')}
            onEditClick={() => this.setState(prevState => ({extraFieldFormOpen: !prevState.extraFieldFormOpen}))}
          />


          {this.state.extraFieldFormOpen ? (
            <Col sm={12} style={{minHeight: 75}}>
              <PropertiesSelect
                label={t('invoice.editExtraFields')}
                value={invoice.extraFields as any}
                onChange={onChange}
              />
            </Col>
          ) : null}
        </Row>


        {invoice.extraFields.length ? (
          <ExtraFieldsInput
            value={invoice.extraFields}
            onChange={onChange}
          />
        ) : null}
      </div>
    );
  }
}
