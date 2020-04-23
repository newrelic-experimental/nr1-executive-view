import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, Menu, Form, Table, Icon} from 'semantic-ui-react';
import { AccountStorageMutation, Toast, Spinner } from 'nr1';

export default class Tags extends React.Component {

  static propTypes = {
    loadedAccounts: PropTypes.array,
    loadedTags: PropTypes.array,
    onTagRefresh: PropTypes.func
  }

  constructor(props){
      super(props)
      this.state = {
        addFormError: true,
        selectedAccounts: "",
        selectedAccountNames: [],
        tagsOpen: false,
        selectedTagOption: 'add',
        tagKey: "",
        tagValue: "",
        tagDeleteValidation: false,
        tagEdit: false,
        currentTag: null,
        firstLoad: true,
        tagsUpdated: false
      }
      this.handleDeleteClick = this.handleDeleteClick.bind(this);
  }

  closeTags = () => {
    this.setState({ tagsOpen: false, selectedTagOption: 'add' }, () => {
      this.resetFormFields();
    })
  }

  resetFormFields(){
    this.setState({
      tagKey: "",
      tagValue: "",
      selectedAccounts: ""
  })
  }

  async saveTag() {
    let addHasErrors = await this.validateAddInput();

    if (addHasErrors) {
      Toast.showToast({title: "Text Validation Error! Please Check Input.", type: Toast.TYPE.CRITICAL})
    } else {
      this.state.selectedAccounts.forEach(acct => {
        AccountStorageMutation.mutate({
          accountId: acct,
          actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
          collection: 'AccountTags:'+ acct.toString(),
          documentId: this.state.tagKey,
          document: {
            "value": this.state.tagValue
          }
        }).then(({ data }) => {
        }).catch(error => {
          console.debug(error);
          Toast.showToast({title: error.message, type: Toast.TYPE.CRITICAL });
        })
      })
      this.props.onTagRefresh();
      this.resetFormFields();
      Toast.showToast({title: "Tag Saved!", type: Toast.TYPE.Normal });
    }
  }

  validateAddInput() {
    const { tagKey, tagValue, selectedAccounts } = this.state;

    if (tagKey == "" || tagValue == "" || selectedAccounts == "") {
      return true;
    } else {
      return false;
    }
  }

  validateUpdateInput() {
    const { tagKey, tagValue } = this.state;

    if (tagKey == "" || tagValue == "") {
      return true;
    } else {
      return false;
    }
  }

  handleDeleteClick(t){
    this.setState({
      tagDeleteValidation: true,
      currentTag: t
    })
  }

  handleEditClick(t){
    this.setState({
      tagEdit: true,
      currentTag: t
    })
  }

  close = () => this.setState({ tagDeleteValidation: false, currentTag: null })

  closeEdit = () => this.setState({ tagEdit: false, currentTag: null })

  renderDeleteConfirmation(){
    return (
      <Modal open={this.state.tagDeleteValidation} onClose={this.close}>
        <Modal.Header>Delete Tag</Modal.Header>
        <Modal.Content>
          <p> Are you sure you want to delete this tag? </p>
        </Modal.Content>
        <Modal.Actions>
          <Button icon onClick={() => this.deleteTag(this.state.currentTag)} color='green'>
            <Icon name='checkmark' /> Yes
          </Button>
          <Button icon onClick={this.close} color='red'>
            <Icon name='remove' /> No
          </Button>
        </Modal.Actions>
      </Modal>
    )
  }

  async deleteTag(tag){
    await AccountStorageMutation.mutate({
      accountId: tag.account,
      actionType: AccountStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
      collection: 'AccountTags:'+ tag.account.toString(),
      documentId: tag.key
    }).then(({ result }) => {
      Toast.showToast({title: 'Tag successfully deleted!'})
    }).catch(error => {
      console.debug(error);
      Toast.showToast({title: error.message, type: Toast.TYPE.CRITICAL });
    })
    await this.setState({
      tagDeleteValidation: false, currentTag: null
    }, () => {
      this.props.onTagRefresh();
    });
  }

  async updateTag(tag) {
    let updateHasErrors = await this.validateUpdateInput();

    if (updateHasErrors) {
      Toast.showToast({title: "Text Validation Error! Please Check Input.", type: Toast.TYPE.CRITICAL})
    } else {
      await AccountStorageMutation.mutate({
        accountId: tag.account,
        actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
        collection: 'AccountTags:'+ tag.account.toString(),
        documentId: this.state.tagKey,
        document: {
          "value": this.state.tagValue
        }
      }).then(({ data }) => {
      }).catch(error => {
        console.debug(error);
        Toast.showToast({title: error.message, type: Toast.TYPE.CRITICAL });
      })
      Toast.showToast({title: 'Tag successfully updated!'})
      this.setState({tagEdit: false, currentTag: null, tagKey: "", tagValue: "", tagsUpdated: false } , () => {
        this.props.onTagRefresh();
      });
    }
  }

  renderEditMenu(){
      return (
        <Modal open={this.state.tagEdit} onClose={this.closeEdit}>
          <Modal.Header>Edit Tag</Modal.Header>
          <Modal.Content>
            <Form.Group widths={10}>
              <Form.Input style={{marginBottom: "10px"}} fluid label={<strong>New Key</strong>} placeholder={this.state.currentTag.key} value={this.state.tagKey} onChange={e => this.setState({ tagKey: e.target.value})} width={4}/>
              <Form.Input fluid label={<strong>New Value</strong>} placeholder={this.state.currentTag.value} value={this.state.tagValue} onChange={e => this.setState({ tagValue: e.target.value})} width={5}/>
            </Form.Group>
          </Modal.Content>
          <Modal.Actions>
            <Button onClick={() => this.updateTag(this.state.currentTag)} color='green'>
              <Icon name='checkmark' /> Yes
            </Button>
            <Button onClick={this.closeEdit} color='red'>
              <Icon name='remove' /> No
            </Button>
          </Modal.Actions>
        </Modal>
    )
  }

  updateAccountSelection(e, k){
    let accountNames = this.state.selectedAccountNames;
    accountNames.push(e.target.innerText)

    this.setState({
      selectedAccounts: k.value,
      selectedAccountNames: accountNames
    })
  }

  tagSelection() {
    const { selectedTagOption, addFormError, selectedAccounts, editIcon, editColor } = this.state;

    const accountOptions = this.props.loadedAccounts.map(acc => ({
      key: acc.id,
      value: acc.id,
      text: acc.name
    }));

    if (selectedTagOption == 'add') {
      return (
        <>
        <Form error={addFormError}>
          <Form.Select width={4} style={{marginBottom: "5px"}} search multiple options={accountOptions} placeholder="Select Account..." value={selectedAccounts} onChange={(e, k) => this.updateAccountSelection(e, k)}/>
          <Form.Group widths={10}>
            <Form.Input fluid label='Tag Name' placeholder='Tag Name' value={this.state.tagKey} onChange={e => this.setState({ tagKey: e.target.value})} width={4}/>
            <Form.Input fluid label='Tag Value' placeholder='Tag Value' value={this.state.tagValue} onChange={e => this.setState({ tagValue: e.target.value})} width={5}/>
          </Form.Group>
        </Form>
        <Button positive icon='checkmark' onClick={() => this.saveTag()}>Save</Button>
        </>
      )
    }

    if (selectedTagOption == 'edit') {
      if (this.props.loadedTags.length > 0){
        return (
          <>
          <Table compact small celled >
            <Table.Header>
              <Table.Row>
              {
                Object.keys(this.props.loadedTags[0]).map((tagHeader) => {
                  return <Table.HeaderCell key={tagHeader}>{tagHeader}</Table.HeaderCell>
                })
              }
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {
                this.props.loadedTags.map((tag) => {
                  let tagKey = tag.account + "-" + tag.key;
                  return <Table.Row key={tagKey}>
                          {
                            Object.keys(tag).map((tagValue) => {
                              if (tagValue == "value") {
                                return (
                                  <Table.Cell key={tag[tagValue]}>{tag[tagValue]}
                                    <Button onClick={() => this.handleDeleteClick(tag)} color='red' icon style={{"float": "right"}}><Icon name='trash alternate'/></Button>
                                    <Button onClick={() => this.handleEditClick(tag)} color='blue' icon style={{"float": "right"}}><Icon name='edit'/></Button>
                                  </Table.Cell>
                                )
                              } else {
                                return <Table.Cell key={tag[tagValue]}>{tag[tagValue]}</Table.Cell>
                              }
                            })
                          }
                         </Table.Row>
                    })
               }
            </Table.Body>
          </Table>
          </>
        )
      } else {
        return <p>No Tags Configured!</p>
      }
    }
  }

  render() {
    let { tagsOpen, selectedTagOption, tagEdit, tagsUpdated } = this.state;

    return (
      <>
        <Modal size="large" open={tagsOpen} onClose={this.closeTags} trigger={<Button onClick={() => this.setState({ tagsOpen: true })} secondary>Tags</Button>}>
          <Modal.Header>Configure Tags</Modal.Header>
          <Modal.Content>
            Add, edit, or remove tags (key-value pairs) associated with retrieved New Relic accounts.
          </Modal.Content>
          <Modal.Content>
            <Menu pointing secondary tabular>
              <Menu.Item
                name="Add"
                active={selectedTagOption === 'add'}
                onClick={() => this.setState({ selectedTagOption: 'add' })}
              />
              <Menu.Item
                name="Edit"
                active={selectedTagOption === 'edit'}
                onClick={() => this.setState({ selectedTagOption: 'edit' })}
              />
            </Menu>
            {this.tagSelection()}
          </Modal.Content>
          <Modal.Actions>
            <Button negative onClick={this.closeTags}>Close</Button>
          </Modal.Actions>
        </Modal>
        {this.renderDeleteConfirmation()}
        {tagEdit === true ? this.renderEditMenu() : ""}
      </>
    )
  }

}
