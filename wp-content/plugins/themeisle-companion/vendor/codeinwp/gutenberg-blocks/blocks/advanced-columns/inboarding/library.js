/**
 * External dependencies
 */
import LazyLoad from 'react-lazy-load';
import classnames from 'classnames';
import uuidv4 from 'uuid';

/**
 * Internal dependencies
 */
import './editor.scss';

import { columnsIcon } from '../../../utils/icons.js';

/**
 * WordPress dependencies
 */
const {
	startCase,
	toLower
} = lodash;

const { __ } = wp.i18n;

const { apiFetch } = wp;

const {
	Button,
	Dashicon,
	Icon,
	TextControl,
	Tooltip,
	Modal,
	Notice,
	SelectControl,
	Spinner
} = wp.components;

const { compose } = wp.compose;

const {
	withSelect,
	withDispatch
} = wp.data;

const { Component } = wp.element;

class Library extends Component {
	constructor() {
		super( ...arguments );

		this.changeTab = this.changeTab.bind( this );
		this.removeError = this.removeError.bind( this );
		this.selectCategory = this.selectCategory.bind( this );
		this.changeSearch = this.changeSearch.bind( this );
		this.changeClientId = this.changeClientId.bind( this );
		this.importTemplate = this.importTemplate.bind( this );
		this.getOptions = this.getOptions.bind( this );

		this.state = {
			tab: 'block',
			isLoaded: false,
			isError: false,
			selectedCategory: 'all',
			search: '',
			blocksCategories: [],
			templateCategories: [],
			data: []
		};
	}

	async componentDidMount() {
		let data = await apiFetch({ path: 'themeisle-gutenberg-blocks/v1/fetch_templates' });

		let blocksCategories = [];
		let templateCategories = [];

		data.map( i => {
			if ( i.categories && i.template_url ) {
				if ( 'block' === i.type ) {
					i.categories.map( o => {
						blocksCategories.push( o );
					});
				}

				if ( 'template' === i.type ) {
					i.categories.map( o => {
						templateCategories.push( o );
					});
				}
			}
		});

		blocksCategories = blocksCategories.filter( ( item, i, ar ) => ar.indexOf( item ) === i ).sort();
		templateCategories = templateCategories.filter( ( item, i, ar ) => ar.indexOf( item ) === i ).sort();

		this.setState({
			blocksCategories,
			templateCategories,
			data,
			isLoaded: true
		});
	}

	changeTab( value ) {
		this.setState({
			tab: value,
			selectedCategory: 'all',
			search: ''
		});
	}

	removeError() {
		this.setState({
			isError: false
		});
	}

	selectCategory( value ) {
		this.setState({
			selectedCategory: value
		});
	}

	changeSearch( value ) {
		this.setState({
			search: value
		});
	}

	changeClientId( data ) {
		if ( Array.isArray( data ) ) {
			data.map( i => this.changeClientId( i ) );
		} else if ( 'object' === typeof data ) {
			Object.keys( data ).map( ( k ) => {
				if ( 'clientId' === k ) {
					data[k] = uuidv4();
				}

				if ( 'innerBlocks' === k ) {
					data[k].map( i => {
						this.changeClientId( i );
					});
				}
			});
		}

		return data;
	}

	async importTemplate( url ) {
		this.setState({
			isLoaded: false
		});

		let data = await apiFetch({ path: `themeisle-gutenberg-blocks/v1/import_template?url=${ url }` });

		data = this.changeClientId( data );

		if ( null !== data ) {
			this.setState({
				isLoaded: true
			});

			this.props.import( data );
		} else {
			this.setState({
				isLoaded: true,
				isError: true
			});
		}
	}

	getOptions() {
		let categories = {};

		categories = ( 'block' === this.state.tab ? this.state.blocksCategories : this.state.templateCategories ).map( i => {
			return i = {
				label: startCase( toLower( i ) ),
				value: i
			};
		});

		const options = [
			{ label: __( 'All Categories' ), value: 'all' },
			...categories
		];

		return options;
	}

	render() {
		const options = this.getOptions();

		return (
			<Modal
				className="themeisle-library-modal"
				onRequestClose={ this.props.close }
				isDismissable={ false }
				shouldCloseOnClickOutside={ false }
			>
				<div className="library-modal-control-panel">
					<div className="library-modal-header">
						<div className="library-modal-header-logo">
							<div className="library-modal-header-tabs-button">
								<Icon icon={ columnsIcon } />
							</div>
						</div>

						<div className="library-modal-header-tabs">
							<Button
								className={ classnames(
									'library-modal-header-tabs-button',
									{ 'is-selected': 'block' === this.state.tab }
								)}
								onClick={ () => this.changeTab( 'block' ) }
							>
								<Dashicon icon="screenoptions" />
								{ __( 'Blocks' ) }
							</Button>

							<Button
								className={ classnames(
									'library-modal-header-tabs-button',
									{ 'is-selected': 'template' === this.state.tab }
								)}
								onClick={ () => this.changeTab( 'template' ) }
							>
								<Dashicon icon="editor-table" />
								{ __( 'Templates' ) }
							</Button>
						</div>

						<div className="library-modal-header-actions">
							<Tooltip text={ __( 'Close' ) }>
								<Button
									className="library-modal-header-tabs-button"
									aria-label={ __( 'Close settings' ) }
									onClick={ this.props.close }
								>
									<Dashicon icon="no-alt" />
								</Button>
							</Tooltip>
						</div>
					</div>

					<div className="library-modal-actions">
						<SelectControl
							className="library-modal-category-control"
							value={ 'all' === this.state.selectedCategory ? 'all' : this.state.selectedCategory }
							onChange={ this.selectCategory }
							options={ options }
						/>

						<TextControl
							type="text"
							value={ this.state.search || '' }
							placeholder={ __( 'Search' ) }
							className="library-modal-search-control"
							onChange={ this.changeSearch }
						/>
					</div>
				</div>

				{ this.state.isError && (
					<div className="library-modal-error">
						<Notice
							status="error"
							onRemove={ this.removeError }
						>
							{ __( 'There seems to be an error. Please try again.' ) }
						</Notice>
					</div>
				)}

				{ this.state.isLoaded ? (
					<div className="library-modal-content">
						{ this.state.data.map( i => {
							if (
								( i.template_url ) &&
								( 'all' === this.state.selectedCategory || i.categories && i.categories.includes( this.state.selectedCategory ) ) &&
								( ! this.state.search || i.keywords && i.keywords.some( o => o.toLowerCase().includes( this.state.search.toLowerCase() ) ) ) &&
								( this.state.tab === i.type )
							) {
								return (
									<Button
										aria-label={ i.title || __( 'Untitled Gutenberg Template' ) }
										onClick={ () => this.importTemplate( i.template_url ) }
									>
										<LazyLoad>
											<img src={ i.screenshot_url || 'https://raw.githubusercontent.com/Codeinwp/gutenberg-templates/master/assets/images/default.jpg' } />
										</LazyLoad>
										<div className="library-modal-overlay">
											<Dashicon icon="plus" size="36"/>
										</div>
									</Button>
								);
							}
						})}
						<Button
							aria-label={ __( 'Coming Soon' ) }
						>
							<LazyLoad>
								<img src={ 'https://raw.githubusercontent.com/Codeinwp/gutenberg-templates/master/assets/images/coming-soon.jpg' } />
							</LazyLoad>
							<div className="library-modal-overlay">
								<Dashicon icon="smiley" size="36"/>
							</div>
						</Button>
					</div>
				) :
					<div className="library-modal-loader">
						<Spinner/>
					</div>
				}
			</Modal>
		);
	}
}

export default compose(
	withSelect( ( select, { clientId }) => {
		const { getBlock } = select( 'core/editor' );
		const block = getBlock( clientId );
		return {
			block
		};
	}),

	withDispatch( ( dispatch, { block }) => ({
		import: ( content ) => dispatch( 'core/editor' ).replaceBlocks(
			block.clientId,
			content,
		)
	}) ),
)( Library );
