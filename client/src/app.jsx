import oo7 from 'oo7';
import React from 'react';
import {ReactiveComponent} from 'oo7-react';
import CircularProgressbar from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import Identicon from 'polkadot-identicon';
import {pretty, reviver, AccountId, setNetworkDefault, denominationInfo} from 'oo7-substrate';

export class WebSocketBond extends oo7.Bond {
	constructor(reviver) {
		super();
		this.reviver = reviver
	}
	initialise () {
		this.start()
	}
	start () {
		let uri = `ws://${new URL(document.location.origin).hostname}:40510`;
		this.ws = new WebSocket(uri)
		this.ws.onopen = function () {}
		let that = this;
		this.ws.onmessage = function (ev) {
			let d = JSON.parse(ev.data, that.reviver)
			if (!that.isReady() && d.init) {
				that.trigger(d.ready)
			} else if (that.isReady() && !d.init) {
				let o = Object.assign({}, that._value)
				Object.keys(d).forEach(k => {
					if (typeof(d[k].value) == 'undefined') {
						delete o[k]
					} else {
						o[k] = d[k].value
					}
				})
				that.trigger(o)
			}
			if (that.reconnect) {
				clearTimeout(that.reconnect)
			}
			that.reconnect = setTimeout(() => {
				that.ws.close()
				delete that.ws
				that.start()
			}, 60000)
		}
	}
	finalise () {
		delete this.ws;
	}
}

let bonds = (new WebSocketBond(reviver)).subscriptable();

setNetworkDefault(42)

const denominationInfoDOT = {
	denominations: {
		dot: 15,
		point: 12,
		µdot: 9,
	},
	primary: 'dot',
	unit: 'planck',
	ticker: 'DOT'
}

const denominationInfoCHR = {
	denominations: {
		chr: 15,
	},
	primary: 'chr',
	unit: 'cherry',
	ticker: 'CHR'
}

setTimeout(() => {
	bonds.chainName.tie(name => {
		if (name) {
			switch (name) {
				case 'Alexander': { denominationInfo.init(denominationInfoDOT); break; }
				case 'Charred Cherry': { denominationInfo.init(denominationInfoCHR); break; }
			}
		}
	}),
	0
})

export class RCircularProgressbar extends ReactiveComponent {
	constructor () {
		super(['percentage', 'text', 'strokeWidth', 'styles', 'classes', 'counterClockwise'])
	}
	render () {
		return (<CircularProgressbar
			percentage={this.state.percentage}
			text={this.state.text}
			strokeWidth={this.state.strokeWidth}
			styles={this.state.styles}
			classes={this.state.classes}
			counterClockwise={this.state.counterClockwise}
		/>)
	}
}

export class Dot extends ReactiveComponent {
	constructor () {
		super(["value", "className"])
	}
	render() {
		return (<span className={this.state.className} name={this.props.name} style={this.props.style}>
			{(this.props.prefix || '') + pretty(this.state.value) + (this.props.suffix || '')}
		</span>)
	}
}

export class ValidatorBalances extends ReactiveComponent {
	constructor () {
		super(["value", "className"])
	}
	render() {
		if (!this.state.value) return (<div/>)
		return (<div className={this.state.className || 'validator-balances'} name={this.props.name}>
			{this.state.value.map((v, i) => (<div key={i} className="validator-balance">
				<div className="validator"><Identicon account={v.who} size={52} className={v.invulnerable ? 'invulnerable' : ''}/></div>
				<div className="nominators">{v.nominators ? v.nominators.map(a => <Identicon account={a} size={24}/>) : null}</div>
				<div className="AccountId">{pretty(v.who).substr(0, 8) + '…'}</div>
				<div className="Balance">{pretty(v.balance)}</div>
				{
					(v.otherBalance > 0
						? <div className="paren">{' (incl. ' + pretty(v.otherBalance) + ' nominated)'}</div>
						: null
					)
				}
				
			</div>))}
		</div>)
	}
}

export class App extends React.Component {
	constructor () {
		super()
		window.bonds = bonds
		window.pretty = pretty
		this.percentLateness = oo7.Bond
			.all([bonds.thisSessionReward, bonds.sessionReward])
			.map(([a, b]) => Math.round(a / b * 100));
	}
	render() {
		return (
			<div id="dash">
			<div id="title">
				<Identicon size='32' account={new AccountId([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])}/> <img src="https://polkadot.network/static/media/logo.096371c0.svg"/>
				<span style={{marginLeft: '3em'}}>
					<Dot style={{border: '1em', color: '#444'}} value={bonds.runtimeVersion.map(v => `${v.specName}-${v.specVersion}`)}/>
					<Dot prefix=' running on v' style={{border: '1em', color: '#888'}} value={bonds.clientVersion}/>
				</span>
			</div>
			<div className="value" id="height">
				<div className="label">height</div>
				<Dot prefix="#" value={bonds.finalisedHeight}/><Dot prefix=' + ' value={bonds.lag} style={{color: '#888'}}/>
			</div>
			<div className="value" id="session-blocks-remaining">
				<div className="circular-progress">
					<RCircularProgressbar
						percentage={
							oo7.Bond
								.all([bonds.sessionBlocksRemaining, bonds.sessionLength])
								.map(([a, b]) => Math.round(a / b * 100))
						}
						styles={{path: { stroke: '#1a7ba8'}}}
						counterClockwise={true}
						initialAnimation={false}
					/>
				</div>
				<div className="label">blocks remaining in session</div>
				<Dot value={bonds.sessionBlocksRemaining} suffix=" of "/>
				<Dot value={bonds.sessionLength}/>
			</div>
			<div className="value" id="session-lateness">
				<div className="circular-progress">
					<RCircularProgressbar
						percentage={this.percentLateness}
						styles={
							this.percentLateness.map(v => ({
								path: { stroke: v == 0 ? '#888' : v > 0.9 ? '#50ba35' : v > 0.8 ? '#ddbc25' : v > 0.7 ? '#bc5821' : '#910000'},
								text: { fill: '#888', fontSize: '28px' },
							}))
						}
						initialAnimation={false}
					/>
				</div>
				<div className="label">session reward</div>
				<Dot value={bonds.thisSessionReward} suffix=" DOT"/>
			</div>
			<div className="value" id="era-blocks-remaining">
				<div className="circular-progress">
					<RCircularProgressbar
						percentage={
							oo7.Bond
								.all([bonds.eraBlocksRemaining, bonds.eraLength])
								.map(([a, b]) => Math.round(a / b * 100))
						}
						styles={{path: { stroke: '#4b1aa8'}}}
						counterClockwise={true}
						initialAnimation={false}
					/>
				</div>
				<div className="label">blocks left in current era</div>
				<Dot value={bonds.eraBlocksRemaining} suffix=" of "/>
				<Dot value={bonds.eraLength}/>
			</div>
			<div className="big list" id="current-validators">
				<div className="label">current validators</div>
				<ValidatorBalances value={bonds.validators}/>
			</div>
			<div className="big list" id="next-validators">
				<div className="label">next validators</div>
				<ValidatorBalances value={bonds.nextValidators}/>
			</div>
			<div className="big list" id="next-three-up">
				<div className="label">next three up</div>
				<ValidatorBalances value={bonds.nextThreeUp}/>
			</div>
			<div id="rest">
				<div>
					<div>eraSessionsRemaining: <Dot value={bonds.eraSessionsRemaining}/></div>
					<div>minimumDeposit: <Dot value={bonds.minimumDeposit}/></div>
					<div>votingPeriod: <Dot value={bonds.votingPeriod}/></div>
					<div>launchPeriod: <Dot value={bonds.launchPeriod}/></div>
				</div>
				<div>
					<div>blockPeriod: <Dot value={bonds.blockPeriod}/></div>
					<div>now: <Dot value={bonds.now}/></div>
					<div>sessionBlocksRemaining: <Dot value={bonds.sessionBlocksRemaining}/></div>
					<div>sessionLength: <Dot value={bonds.sessionLength}/></div>
					<div>currentStart: <Dot value={bonds.currentStart}/></div>
				</div>
			</div>
		</div>);
	}
}
/*
					<div>activeReferenda: <Dot value={bonds.activeReferenda}/></div>
					<div>proposedReferenda: <Dot value={bonds.proposedReferenda}/></div>
			<div>
				<div>Chain: <div style={{marginLeft: '1em'}}>
					<div>Code: <Rspan>{bonds.codeSize}</Rspan> bytes (<Rspan>{bonds.codeHash}</Rspan>)</div>
					<div>Next three up: <Rspan>{bonds.nextThreeUp.map(pretty)}</Rspan></div>
					<div>Now: <Rspan>{bonds.now.map(pretty)}</Rspan></div>
					<div>Block Period: <Rspan>{bonds.blockPeriod.map(x => x.number + ' seconds')}</Rspan></div>
					<div>Limit to become validator: <Rspan>{bonds.validatorLimit.map(pretty)}</Rspan></div>
				</div></div>
				<div>Sessions: <div style={{marginLeft: '1em'}}>
					<div>Current Index: <Rspan>{bonds.currentIndex.map(pretty)}</Rspan></div>
					<div>Current Start: <Rspan>{bonds.currentStart.map(d => d.toLocaleString())}</Rspan></div>
					<div>Last Length Change: #<Rspan>{bonds.lastLengthChange.map(pretty)}</Rspan></div>
				</div></div>
				<div>Staking: <div style={{marginLeft: '1em'}}>
					<div>Sessions per era: <Rspan>{bonds.sessionsPerEra.map(pretty)}</Rspan></div>
					<div>Current era: <Rspan>{bonds.currentEra.map(pretty)}</Rspan></div>
				</div></div>
			</div>
*/
/*			
			<div>Council: <div style={{marginLeft: '1em'}}>
				<div>Members: <Rspan>{this.pd.council.active.map(pretty)}</Rspan></div>
				<div>Candidates: <Rspan>{this.pd.council.candidates.map(pretty)}</Rspan></div>
				<div>Candidacy bond: <Rspan>{this.pd.council.candidacyBond.map(pretty)}</Rspan></div>
				<div>Voting bond: <Rspan>{this.pd.council.votingBond.map(pretty)}</Rspan></div>
				<div>Present slash per voter: <Rspan>{this.pd.council.presentSlashPerVoter.map(pretty)}</Rspan></div>
				<div>Carry count: <Rspan>{this.pd.council.carryCount.map(pretty)}</Rspan></div>
				<div>Presentation duration: <Rspan>{this.pd.council.presentationDuration.map(pretty)}</Rspan></div>
				<div>Inactive grace period: <Rspan>{this.pd.council.inactiveGracePeriod.map(pretty)}</Rspan></div>
				<div>Voting period: <Rspan>{this.pd.council.votingPeriod.map(pretty)}</Rspan></div>
				<div>Term duration: <Rspan>{this.pd.council.termDuration.map(pretty)}</Rspan></div>
				<div>Desired seats: <Rspan>{this.pd.council.desiredSeats.map(pretty)}</Rspan></div>
			</div></div>
			<div>Council Voting: <div style={{marginLeft: '1em'}}>
				<div>Voting Period: <Rspan>{this.pd.councilVoting.votingPeriod.map(pretty)}</Rspan></div>
				<div>Cooloff Period: <Rspan>{this.pd.councilVoting.cooloffPeriod.map(pretty)}</Rspan></div>
				<div>Proposals: <Rspan>{this.pd.councilVoting.proposals.map(pretty)}</Rspan></div>
			</div></div>
			<div>
			<AccountIdBond bond={this.who} />
			Balance of <Rspan style={{fontFamily: 'monospace', fontSize: 'small'}}>{this.who.map(ss58_encode)}</Rspan> is <Rspan>{this.pd.staking.balance(this.who)}</Rspan>
			</div>
*/
