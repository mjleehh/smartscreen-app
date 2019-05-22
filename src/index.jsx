import React from 'react'
import ReactDom from 'react-dom'
import {connect, Provider} from 'react-redux'
import {createStore, applyMiddleware} from 'redux'
import thunk from 'redux-thunk'
import axios from 'axios'
import 'antd/dist/antd.css'
import {Card, Button, PageHeader} from 'antd'
import {composeWithDevTools} from 'redux-devtools-extension'
import _ from 'lodash'

import './style.scss'

const REQUEST_DEMO_TIMEOUT = 2000

const DevicesStatus = {
    EMPTY:   'EMPTY',
    LOADING: 'LAODING',
    IDLE:  'IDLE',
}

const GETTING_DEVICES = 'GETTING_DEVICES'
const gettingDevices = () => ({type: GETTING_DEVICES})

const GOT_DEVICES = 'GOT_DEVICES'
const gotDevices = devices => ({type: GOT_DEVICES, payload: devices})

const reqGetDevices = () => async dispatch => {
    dispatch(gettingDevices())
    try {
        const {data: {devices}} = await axios.get('/api/devices')
        dispatch(gotDevices(devices))
    } catch {
        dispatch(gotDevices([]))
    }
}


const CHANGING_MESSAGE = 'CHANGING_MESSAGE'
const changingMessage = deviceId => ({type: CHANGING_MESSAGE, payload: deviceId})

const CHANGED_MESSAGE = 'CHANGED_MESSAGE'
const changedMessage = (deviceId, msg) => ({type: CHANGED_MESSAGE, payload: deviceId})

const reqChangeMessage = (deviceId, msg) => async dispatch => {
    dispatch(changingMessage(deviceId))
    setTimeout(async () => {
        try {
            await axios.put(`/api/${deviceId}/message`, {msg})
            dispatch(changedMessage(deviceId, msg))
        } catch {
            dispatch(changedMessage(deviceId, ""))
        }
    }, 2000)
}

function initialState() {
    return {
        devicesStatus: DevicesStatus.EMPTY,
        updatingDevices: {},
        devices: null,
    }
}

function reducer(state = initialState(), {type, payload}) {
    switch (type) {
        case GETTING_DEVICES:
            return {...state, devicesStatus: DevicesStatus.LOADING}
        case GOT_DEVICES:
            return {...state, devices: payload, devicesStatus: DevicesStatus.IDLE}
        case CHANGING_MESSAGE: {
            const {updatingDevices} = state
            return {...state, updatingDevices: {...updatingDevices, [payload]: true}}
        }
        case CHANGED_MESSAGE: {
            const {updatingDevices} = state
            return {...state, updatingDevices: {...updatingDevices, [payload]: false}}
        }
        default:
            return state
    }
}

@connect(({updatingDevices}) => ({updatingDevices}))
class Device extends React.Component {
    constructor(props) {
        super(props);

        this.messageInput = React.createRef()
    }

    isUpdating() {
        const {updatingDevices, id} = this.props
        return !!updatingDevices[id]
    }

    updateMessage = () => {
        const {id, dispatch} = this.props
        dispatch(reqChangeMessage(id, this.messageInput.current.value))
    }

    render() {
        const {name, comment, msg} = this.props

        return <Card title={name} style={{width: '30em', margin: '3em'}}>
            <p>info: {comment}</p>
            <p><input
                ref={this.messageInput}
                style={{'marginRight': '1em'}}
            />
            <Button
                onClick={this.updateMessage}
                loading={this.isUpdating()}
            >update</Button>
            </p>
        </Card>
    }
}

@connect(({devicesStatus, devices}) => ({devicesStatus, devices}))
class App extends React.Component {
    updateDevices = () => {
        this.props.dispatch(reqGetDevices())
    }

    isLoading() {
        return this.props.devicesStatus === DevicesStatus.LOADING
    }

    render() {
        return <div>
            <PageHeader
                title="Smartscreen Manager"
                extra={[
                    <Button key="update"
                            onClick={this.updateDevices}
                            loading={this.isLoading()}
                    >Update List</Button>
                ]}/>
            <div>{this.renderDeviceList()}</div>
        </div>
    }

    renderDeviceList() {
        const {devicesStatus} = this.props
        switch (devicesStatus) {
            case DevicesStatus.IDLE:
                return this.props.devices.map(({id, name, comment, msg}) =>
                    <Device key={id} id={id} name={name} comment={comment} msg={msg}/>)
            case DevicesStatus.LOADING:
                return <div> </div>
            default:
                return <div>no devices</div>
        }
    }
}

const store = createStore(reducer, composeWithDevTools(applyMiddleware(thunk)))
store.dispatch(reqGetDevices())

ReactDom.render(
    <Provider store={store}>
        <App/>
    </Provider> ,
    document.getElementById('main')
)
