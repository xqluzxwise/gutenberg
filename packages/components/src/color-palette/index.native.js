/**
 * External dependencies
 */
import {
	ScrollView,
	TouchableWithoutFeedback,
	View,
	Animated,
	Easing,
	Dimensions,
	Platform,
	Text,
} from 'react-native';
import { map, uniq } from 'lodash';
/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useState, useEffect, useRef } from '@wordpress/element';
import { usePreferredColorSchemeStyle } from '@wordpress/compose';
/**
 * Internal dependencies
 */
import styles from './style.scss';
import ColorIndicator from '../color-indicator';
import { colorsUtils } from '../mobile/color-settings/utils';
import { performLayoutAnimation } from '../mobile/utils';

const ANIMATION_DURATION = 200;

let contentWidth = 0;
let scrollPosition = 0;
let customIndicatorWidth = 0;

function ColorPalette( {
	setColor,
	activeColor,
	isGradientColor,
	defaultSettings,
	currentSegment,
	onCustomPress,
	shouldEnableBottomSheetScroll,
} ) {
	const customSwatchGradients = [
		'linear-gradient(120deg, rgba(255,0,0,.8), 0%, rgba(255,255,255,1) 70.71%)',
		'linear-gradient(240deg, rgba(0,255,0,.8), 0%, rgba(0,255,0,0) 70.71%)',
		'linear-gradient(360deg, rgba(0,0,255,.8), 0%, rgba(0,0,255,0) 70.71%)',
	];

	const scrollViewRef = useRef();
	const isIOS = Platform.OS === 'ios';

	const isGradientSegment = currentSegment === colorsUtils.segments[ 1 ];

	const [ scale ] = useState( new Animated.Value( 1 ) );
	const [ opacity ] = useState( new Animated.Value( 1 ) );

	const defaultColors = uniq( map( defaultSettings.colors, 'color' ) );
	const defaultGradientColors = uniq(
		map( defaultSettings.gradients, 'gradient' )
	);
	const colors = isGradientSegment ? defaultGradientColors : defaultColors;

	const customIndicatorColor = isGradientSegment
		? activeColor
		: customSwatchGradients;
	const isCustomGradientColor = isGradientColor && isSelectedCustom();
	const shouldShowCustomIndicator =
		! isGradientSegment || isCustomGradientColor;

	const accessibilityHint = isGradientSegment
		? __( 'Navigates to customize gradient' )
		: __( 'Navigates to custom color picker' );
	const customText = isIOS ? __( 'Custom' ) : __( 'CUSTOM' );

	useEffect( () => {
		if ( scrollViewRef.current ) {
			scrollViewRef.current.scrollTo( { x: 0, y: 0 } );
		}
	}, [ currentSegment ] );

	function isSelectedCustom() {
		const isWithinColors = activeColor && colors.includes( activeColor );
		if ( activeColor ) {
			if ( isGradientSegment ) {
				return isGradientColor && ! isWithinColors;
			}
			return ! isGradientColor && ! isWithinColors;
		}
		return false;
	}

	function isSelected( color ) {
		return ! isSelectedCustom() && activeColor === color;
	}

	function timingAnimation( property, toValue ) {
		return Animated.timing( property, {
			toValue,
			duration: ANIMATION_DURATION,
			easing: Easing.ease,
			useNativeDriver: true,
		} );
	}

	function performAnimation( color ) {
		opacity.setValue( isSelected( color ) ? 1 : 0 );
		scale.setValue( 1 );

		Animated.parallel( [
			timingAnimation( scale, 2 ),
			timingAnimation( opacity, 1 ),
		] ).start();
	}

	const scaleInterpolation = scale.interpolate( {
		inputRange: [ 1, 1.5, 2 ],
		outputRange: [ 1, 0.7, 1 ],
	} );

	function deselectCustomGradient() {
		const { width } = Dimensions.get( 'window' );
		const isVisible =
			contentWidth - scrollPosition - customIndicatorWidth < width;

		if ( isCustomGradientColor ) {
			performLayoutAnimation();
			if ( ! isIOS ) {
				// Scroll position on Android doesn't adjust automatically when removing the last item from the horizontal list.
				// https://github.com/facebook/react-native/issues/27504
				// Workaround: Force the scroll when deselecting custom gradient color and when custom indicator is visible on layout.
				if (
					isCustomGradientColor &&
					isVisible &&
					scrollViewRef.current
				) {
					scrollViewRef.current.scrollTo( {
						x: scrollPosition - customIndicatorWidth,
					} );
				}
			}
		}
	}

	function onColorPress( color ) {
		deselectCustomGradient();
		performAnimation( color );
		setColor( color );
	}

	function onContentSizeChange( width ) {
		contentWidth = width;
		if ( isSelectedCustom() && scrollViewRef.current ) {
			scrollViewRef.current.scrollToEnd( { animated: ! isIOS } );
		}
	}

	function onCustomIndicatorLayout( { nativeEvent } ) {
		const { width } = nativeEvent.layout;
		if ( width !== customIndicatorWidth ) {
			customIndicatorWidth = width;
		}
	}

	const verticalSeparatorStyle = usePreferredColorSchemeStyle(
		styles.verticalSeparator,
		styles.verticalSeparatorDark
	);

	const customTextStyle = usePreferredColorSchemeStyle(
		[ styles.customText, ! isIOS && styles.customTextLetterSpacing ],
		styles.customTextDark
	);

	return (
		<ScrollView
			contentContainerStyle={ styles.contentContainer }
			style={ styles.container }
			horizontal
			showsHorizontalScrollIndicator={ false }
			keyboardShouldPersistTaps="always"
			disableScrollViewPanResponder
			onScroll={ ( { nativeEvent } ) =>
				( scrollPosition = nativeEvent.contentOffset.x )
			}
			onContentSizeChange={ onContentSizeChange }
			onScrollBeginDrag={ () => shouldEnableBottomSheetScroll( false ) }
			onScrollEndDrag={ () => shouldEnableBottomSheetScroll( true ) }
			ref={ scrollViewRef }
		>
			{ colors.map( ( color ) => {
				const scaleValue = isSelected( color ) ? scaleInterpolation : 1;
				return (
					<TouchableWithoutFeedback
						onPress={ () => onColorPress( color ) }
						key={ `${ color }-${ isSelected( color ) }` }
						accessibilityRole={ 'button' }
						accessibilityState={ { selected: isSelected( color ) } }
						accessibilityHint={ color }
					>
						<Animated.View
							style={ {
								transform: [
									{
										scale: scaleValue,
									},
								],
							} }
						>
							<ColorIndicator
								color={ color }
								isSelected={ isSelected( color ) }
								opacity={ opacity }
								style={ styles.colorIndicator }
							/>
						</Animated.View>
					</TouchableWithoutFeedback>
				);
			} ) }
			{ shouldShowCustomIndicator && (
				<View
					style={ styles.customIndicatorWrapper }
					onLayout={ onCustomIndicatorLayout }
				>
					<View style={ verticalSeparatorStyle } />
					<TouchableWithoutFeedback
						onPress={ onCustomPress }
						accessibilityRole={ 'button' }
						accessibilityState={ { selected: isSelectedCustom() } }
						accessibilityHint={ accessibilityHint }
					>
						<View style={ styles.customIndicatorWrapper }>
							<ColorIndicator
								withCustomPicker={ ! isGradientSegment }
								color={ customIndicatorColor }
								isSelected={ isSelectedCustom() }
								style={ styles.colorIndicator }
							/>
							<Text style={ customTextStyle }>
								{ customText }
							</Text>
						</View>
					</TouchableWithoutFeedback>
				</View>
			) }
		</ScrollView>
	);
}

export default ColorPalette;
