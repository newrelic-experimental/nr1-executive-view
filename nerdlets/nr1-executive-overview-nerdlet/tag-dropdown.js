import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from 'semantic-ui-react';
import { Spinner } from 'nr1';

export default class TagDropdown extends React.Component {

  static propTypes = {
    loadedTags: PropTypes.array,
    filerChange: PropTypes.func
  }

  constructor(props){
    super(props);
  }

  renderTagDropdowns(){
    const { loadedTags } = this.props;

    let filtered = loadedTags.filter((v, i, a) => a.findIndex(t => (t.key === v.key && t.value === v.value)) === i);
    const merged = filtered.reduce((acc, curr) => {
       const keyIndex = acc.findIndex(item => item.key === curr.key);

       if (keyIndex > -1) { //key already exists
         acc[keyIndex].values.push({key: curr.value, text: curr.value, value: curr.value});

         return acc;
       } else { //key is first encountered
         acc.push({
           key: curr.key,
           values: [{ key: curr.value, text: curr.value, value: curr.value }],
         });
         return acc;
       }
    }, []);

    return (
      <>
      {merged.map(t => (
        <Dropdown
          clearable
          style={{ marginLeft: "10px", marginRight: "7px" }}
          placeholder={t.key}
          selection
          options={t.values}
          onChange={(e, d) => this.props.filterChange(e, d)}
        />
      ))}
      </>
    )
}

  render() {
    return (
      this.renderTagDropdowns()
    )
  }

}
