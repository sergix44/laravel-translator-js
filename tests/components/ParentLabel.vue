<script setup lang="ts">
import {trans} from '../../src'
import ChildLabel from './ChildLabel.vue'

const label = trans('Welcome!')
</script>

<template>
    <ChildLabel :label="label"/>
</template>
