$(async () => {
  function isNotEmpty(value) {
    return value !== undefined && value !== null && value !== ''
  }

  function debounce(func, timeout = 300) {
    let timer
    return (...args) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        func.apply(this, args)
      }, timeout)
    }
  }

  const transformName = (name) => {
    return name
      .replace(' WA', '')
      .split(' ')
      .map((w) => w[0].toUpperCase() + w.substr(1).toLowerCase())
      .join(' ')
      .replace('Ii', '2')
  }

  const data = await fetch('./all.json')
    .then((res) => res.json())
    .catch(() => {
      throw 'Data loading error'
    })

  console.log(data)

  const getCategories = () => {
    return data.reduce((set, store) => {
      // console.log(store)
      store.items.forEach((itm) => {
        itm.categories.forEach((c) => {
          set[c] = new Set([...(set[c] || []), itm.name])
        })
      })
      return set
    }, {})
  }

  const getColumns = () => {
    return [
      {
        caption: 'Store',
        fixed: true,
        columns: [
          {
            caption: 'Post',
            allowSorting: true,
            allowSearch: true,
            width: 48,
            calculateCellValue(data) {
              return data.store.address.postalZip
            },
            calculateSortValue(data) {
              return data.store.address.postalZip
            },
          },
          {
            caption: 'Name',
            alignment: 'right',
            sortOrder: 'asc',
            allowSorting: true,
            allowSearch: true,
            width: 200,
            calculateCellValue(data) {
              return transformName(data.store.name)
            },
            calculateSortValue(data) {
              return transformName(data.store.name)
            },
          },
        ],
      },
      ...data[0].items.map((itm) => ({
        caption: itm.name,
        name: itm.name,
        // width: 120,
        allowSorting: true,
        format: {
          precision: 2,
          type: 'currency',
        },
        calculateCellValue(data) {
          const foundItm = data.items.find((item) => item.name === itm.name)
          if (foundItm) return foundItm.price
          return 'N/A'
        },
        calculateSortValue(data) {
          const foundItm = data.items.find((item) => item.name === itm.name)
          if (foundItm) return foundItm.price
          return 'N/A'
        },
      })),
    ]
  }

  const store = new DevExpress.data.CustomStore({
    loadMode: 'raw', // omit in the DataGrid, TreeList, PivotGrid, and Scheduler
    load: function() {
      return data
    },
  })

  var dataGrid = $('#gridContainer')
    .dxDataGrid({
      dataSource: store,
      searchPanel: {
        visible: true,
        placeholder: 'Search stores...',
      },
      showBorders: true,
      showRowLines: true,
      rowAlternationEnabled: true,
      remoteOperations: false,
      paging: {
        pageSize: 32,
        enabled: true,
      },
      pager: {
        showPageSizeSelector: true,
        allowedPageSizes: [8, 16, 32, 48, 96],
      },
      columnAutoWidth: true,
      columns: getColumns(),
      sorting: {
        mode: 'single',
      },
    })
    .dxDataGrid('instance')

  const categories = getCategories()
  const categoryNames = [...Object.keys(categories)]
  const selectedCategories = new Set(categoryNames)

  let searchValue = ''

  const filterItemsByName = (name, reset = false) => {
    if (name || reset) {
      data[0].items.forEach((itm) => {
        dataGrid.columnOption(
          itm.name,
          'visible',
          reset ? true : itm.name.toLowerCase().includes(name.toLowerCase())
        )
      })
    }
  }

  const addButtons = (allSelected = true) => {
    $('#controls').html('')

    let container = $('<div>')
    $('<input />', {
      type: 'checkbox',
      id: 'cb-all',
      value: 'Select All',
      checked: allSelected,
      change: (e) => {
        const selected = e.target.checked
        if (!selected) {
          selectedCategories.clear()
        } else {
          Object.keys(categories).forEach((c) => selectedCategories.add(c))
        }

        dataGrid.beginUpdate()
        Object.values(categories).forEach((itm) => {
          itm.forEach((i) => dataGrid.columnOption(i, 'visible', selected))
        })
        filterItemsByName(searchValue)
        dataGrid.endUpdate()
        addButtons(selected)
      },
    }).appendTo(container)
    $('<label />', { for: 'cb-all', text: 'Select All' }).appendTo(container)
    $('#controls').append(container)

    Object.keys(categories).forEach((category) => {
      const id = category.replace(/\s/g, '-').replace('&', 'and')
      let container = $('<div>')
      let label = $('<label />', { for: 'cb-' + id })
      $('<input />', {
        type: 'checkbox',
        id: 'cb-' + id,
        value: category,
        checked: selectedCategories.has(category),
        change: (e) => {
          const selected = e.target.checked
          if (!selected) {
            selectedCategories.delete(category)
          } else {
            selectedCategories.add(category)
          }

          const items = categories[category]
          dataGrid.beginUpdate()
          items.forEach((itm) => {
            dataGrid.columnOption(itm, 'visible', selected)
          })
          filterItemsByName(searchValue)
          dataGrid.endUpdate()
        },
      }).appendTo(label)
      label.append(category)
      label.appendTo(container)

      $('#controls').append(container)
    })
  }

  const filterItems = $('<div />').dxTextBox({
    value: searchValue,
    showClearButton: true,
    placeholder: 'Search items...',
    valueChangeEvent: 'keyup',
    mode: 'search',
    onValueChanged: debounce((input) => {
      console.log(input)
      searchValue = input.value
      dataGrid.beginUpdate()
      filterItemsByName(
        searchValue,
        // reset if clearing name
        !input.value.trim() && input.previousValue !== input.value
      )
      dataGrid.endUpdate()
    }),
  })
  $('.dx-toolbar-after').append(filterItems)

  addButtons()
})
